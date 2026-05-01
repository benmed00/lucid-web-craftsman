-- ============================================================================
-- FIX SECURITY DEFINER VIEWS - Explicitly set SECURITY INVOKER
-- ============================================================================

-- Drop and recreate profiles_masked view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_masked;
CREATE VIEW public.profiles_masked 
WITH (security_invoker = true) AS
SELECT 
    profiles.id,
    CASE
        WHEN (is_profile_owner(profiles.id) OR is_admin_user(auth.uid())) THEN profiles.full_name
        ELSE (SUBSTRING(profiles.full_name FROM 1 FOR 2) || '***'::text)
    END AS full_name,
    CASE
        WHEN is_profile_owner(profiles.id) THEN profiles.phone
        WHEN is_admin_user(auth.uid()) THEN (mask_phone((profiles.phone)::text))::character varying
        ELSE NULL::character varying
    END AS phone,
    CASE
        WHEN is_profile_owner(profiles.id) THEN profiles.address_line1
        ELSE '*** (hidden)'::text
    END AS address_line1,
    CASE
        WHEN is_profile_owner(profiles.id) THEN profiles.address_line2
        ELSE NULL::text
    END AS address_line2,
    profiles.city,
    CASE
        WHEN (is_profile_owner(profiles.id) OR is_admin_user(auth.uid())) THEN (profiles.postal_code)::text
        ELSE (SUBSTRING(profiles.postal_code FROM 1 FOR 2) || '***'::text)
    END AS postal_code,
    profiles.country,
    CASE
        WHEN (is_profile_owner(profiles.id) OR is_admin_user(auth.uid())) THEN profiles.bio
        ELSE NULL::text
    END AS bio,
    profiles.avatar_url,
    profiles.created_at,
    profiles.updated_at
FROM profiles;

-- Drop and recreate contact_messages_masked view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.contact_messages_masked;
CREATE VIEW public.contact_messages_masked 
WITH (security_invoker = true) AS
SELECT 
    cm.id,
    (left(cm.first_name, 1) || '***'::text) AS first_name,
    (left(cm.last_name, 1) || '***'::text) AS last_name,
    ((left(cm.email, 2) || '***@'::text) || split_part(cm.email, '@'::text, 2)) AS email,
    CASE
        WHEN (cm.phone IS NOT NULL) THEN ('***-'::text || right(regexp_replace(cm.phone, '[^0-9]'::text, ''::text, 'g'::text), 4))
        ELSE NULL::text
    END AS phone,
    cm.company,
    cm.subject,
    (left(cm.message, 100) ||
        CASE
            WHEN (length(cm.message) > 100) THEN '...'::text
            ELSE ''::text
        END) AS message_preview,
    cm.status,
    cm.created_at,
    cm.updated_at,
    NULL::inet AS ip_address
FROM contact_messages cm
WHERE has_role(auth.uid(), 'super_admin'::app_role);

-- Drop and recreate email_logs_masked view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.email_logs_masked;
CREATE VIEW public.email_logs_masked 
WITH (security_invoker = true) AS
SELECT 
    el.id,
    mask_email(el.recipient_email) AS recipient_email,
    (left(COALESCE(el.recipient_name, ''::text), 1) || '***'::text) AS recipient_name,
    el.template_name,
    el.status,
    el.sent_at,
    el.created_at,
    el.order_id
FROM email_logs el
WHERE has_role(auth.uid(), 'super_admin'::app_role);