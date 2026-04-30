-- =====================================================
-- FIX 1: Remove duplicate shipping_addresses policies
-- =====================================================

-- Drop potentially conflicting policies
DROP POLICY IF EXISTS "shipping_addresses_select_policy" ON public.shipping_addresses;
-- Keep only shipping_addresses_select_strict which was created earlier

-- =====================================================
-- FIX 2: admin_users - restrict SELECT to super_admin only
-- =====================================================

DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;

-- Only super_admins can view admin user list
CREATE POLICY "admin_users_select_super_admin_only"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- FIX 3: contact_messages_masked view - apply RLS via security barrier
-- Since views can't have RLS directly, recreate with proper security
-- =====================================================

DROP VIEW IF EXISTS public.contact_messages_masked;

-- Recreate as a secure admin-only view
CREATE VIEW public.contact_messages_masked
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
    cm.id,
    (LEFT(cm.first_name, 1) || '***') AS first_name,
    (LEFT(cm.last_name, 1) || '***') AS last_name,
    (LEFT(cm.email, 2) || '***@' || split_part(cm.email, '@', 2)) AS email,
    CASE
        WHEN cm.phone IS NOT NULL THEN ('***-' || RIGHT(regexp_replace(cm.phone, '[^0-9]', '', 'g'), 4))
        ELSE NULL
    END AS phone,
    cm.company,
    cm.subject,
    (LEFT(cm.message, 100) ||
        CASE
            WHEN LENGTH(cm.message) > 100 THEN '...'
            ELSE ''
        END) AS message_preview,
    cm.status,
    cm.created_at,
    cm.updated_at,
    NULL::inet AS ip_address
FROM public.contact_messages cm
WHERE public.has_role(auth.uid(), 'super_admin');

-- Revoke from public/anon
REVOKE ALL ON public.contact_messages_masked FROM anon;
REVOKE ALL ON public.contact_messages_masked FROM public;
GRANT SELECT ON public.contact_messages_masked TO authenticated;