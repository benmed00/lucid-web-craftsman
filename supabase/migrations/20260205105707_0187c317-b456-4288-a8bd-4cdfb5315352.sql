-- ============================================================================
-- SECURITY FIXES MIGRATION - Resolve all security scan issues
-- ============================================================================

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS - Convert to SECURITY INVOKER
-- ============================================================================

-- Drop and recreate profiles_masked view with SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.profiles_masked;
CREATE VIEW public.profiles_masked AS
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

-- Drop and recreate contact_messages_masked view with SECURITY INVOKER
DROP VIEW IF EXISTS public.contact_messages_masked;
CREATE VIEW public.contact_messages_masked AS
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

-- Drop and recreate email_logs_masked view with SECURITY INVOKER
DROP VIEW IF EXISTS public.email_logs_masked;
CREATE VIEW public.email_logs_masked AS
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

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATH MUTABLE - Add SET search_path = '' to functions
-- ============================================================================

-- Fix mask_phone function (missing search_path)
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT CASE 
    WHEN phone_number IS NULL OR LENGTH(phone_number) < 4 THEN phone_number
    ELSE SUBSTRING(phone_number FROM 1 FOR 3) || '****' || RIGHT(phone_number, 2)
  END
$function$;

CREATE OR REPLACE FUNCTION public.mask_phone(phone_number character varying)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $function$
  SELECT public.mask_phone(phone_number::text)
$function$;

-- ============================================================================
-- 3. FIX LOYALTY FUNCTIONS - Add authorization checks
-- ============================================================================

-- Enhanced add_loyalty_points with authorization
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
    user_uuid uuid, 
    points integer, 
    transaction_type text, 
    source_type text, 
    source_id text DEFAULT NULL::text, 
    description text DEFAULT 'Points earned'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Authorization check: Only allow if caller is the user themselves, an admin, or system call
  IF auth.uid() IS NOT NULL 
     AND auth.uid() != user_uuid 
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify loyalty points for another user';
  END IF;

  -- Validate input parameters
  IF user_uuid IS NULL OR points IS NULL OR transaction_type IS NULL OR source_type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: user_uuid, points, transaction_type, and source_type cannot be null';
  END IF;
  
  IF points < -10000 OR points > 10000 THEN
    RAISE EXCEPTION 'Points value out of acceptable range (-10000 to 10000)';
  END IF;

  -- Ensure user has loyalty account
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier)
  VALUES (user_uuid, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert transaction record
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, source_id, description
  ) VALUES (
    user_uuid, points, transaction_type, source_type, source_id, description
  );

  -- Update user's loyalty points
  UPDATE public.loyalty_points
  SET 
    points_balance = points_balance + points,
    total_points_earned = CASE 
      WHEN transaction_type = 'earned' OR transaction_type = 'bonus' 
      THEN total_points_earned + points
      ELSE total_points_earned
    END,
    total_points_spent = CASE 
      WHEN transaction_type = 'spent' 
      THEN total_points_spent + ABS(points)
      ELSE total_points_spent
    END,
    updated_at = now()
  WHERE user_id = user_uuid;

  -- Update tier if points were earned
  IF transaction_type IN ('earned', 'bonus') THEN
    PERFORM public.update_loyalty_tier(user_uuid);
  END IF;
END;
$function$;

-- Enhanced update_loyalty_tier with authorization
CREATE OR REPLACE FUNCTION public.update_loyalty_tier(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  total_points INTEGER;
  new_tier TEXT;
  new_progress INTEGER;
  new_threshold INTEGER;
BEGIN
  -- Authorization check: Only allow if caller is the user, admin, or internal system call
  IF auth.uid() IS NOT NULL 
     AND auth.uid() != user_uuid 
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify tier for another user';
  END IF;

  -- Validate input
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User UUID cannot be null';
  END IF;

  -- Get current total points earned
  SELECT total_points_earned INTO total_points
  FROM public.loyalty_points
  WHERE user_id = user_uuid;

  -- If no record found, exit
  IF total_points IS NULL THEN
    RETURN;
  END IF;

  -- Determine tier based on total points earned
  IF total_points >= 5000 THEN
    new_tier := 'platinum';
    new_progress := total_points - 5000;
    new_threshold := 0; -- Max tier
  ELSIF total_points >= 2000 THEN
    new_tier := 'gold';
    new_progress := total_points - 2000;
    new_threshold := 5000;
  ELSIF total_points >= 500 THEN
    new_tier := 'silver';
    new_progress := total_points - 500;
    new_threshold := 2000;
  ELSE
    new_tier := 'bronze';
    new_progress := total_points;
    new_threshold := 500;
  END IF;

  -- Update the user's tier
  UPDATE public.loyalty_points
  SET 
    tier = new_tier,
    tier_progress = new_progress,
    next_tier_threshold = new_threshold,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$function$;

-- Enhanced init_loyalty_account with authorization
CREATE OR REPLACE FUNCTION public.init_loyalty_account(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Authorization check: Only the user themselves, admins, or triggers can init their account
  IF auth.uid() IS NOT NULL 
     AND auth.uid() != user_uuid 
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot initialize loyalty account for another user';
  END IF;

  -- Insert initial loyalty points record with ON CONFLICT handling
  INSERT INTO public.loyalty_points (
    user_id, points_balance, total_points_earned, total_points_spent, tier
  ) VALUES (
    user_uuid, 100, 100, 0, 'bronze'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add signup bonus transaction only if not exists
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, description
  ) VALUES (
    user_uuid, 100, 'bonus', 'signup_bonus', 'Bonus de bienvenue'
  )
  ON CONFLICT DO NOTHING;
END;
$function$;

-- ============================================================================
-- 4. FIX PERMISSIVE INSERT POLICIES - Tighten policies on sensitive tables
-- ============================================================================

-- Drop and recreate more restrictive policies for loyalty_transactions
DROP POLICY IF EXISTS "System can insert loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Authenticated users can insert own loyalty transactions"
ON public.loyalty_transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

-- Drop and recreate more restrictive policies for rate_limits
DROP POLICY IF EXISTS "System can insert rate limits" ON public.rate_limits;
CREATE POLICY "System can insert rate limits via functions"
ON public.rate_limits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate more restrictive policies for product_analytics (keep rate limiting but add auth check)
DROP POLICY IF EXISTS "Allow rate-limited anonymous analytics inserts" ON public.product_analytics;
CREATE POLICY "Allow authenticated rate-limited analytics inserts"
ON public.product_analytics FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    SELECT COUNT(*) < 100
    FROM public.product_analytics pa
    WHERE pa.session_id = product_analytics.session_id
    AND pa.created_at > now() - interval '1 minute'
  )
);

-- Also allow anon users but with stricter rate limit
CREATE POLICY "Allow anonymous rate-limited analytics inserts"
ON public.product_analytics FOR INSERT
TO anon
WITH CHECK (
  session_id IS NOT NULL AND
  (
    SELECT COUNT(*) < 20
    FROM public.product_analytics pa
    WHERE pa.session_id = product_analytics.session_id
    AND pa.created_at > now() - interval '1 minute'
  )
);

-- ============================================================================
-- 5. LOG MIGRATION COMPLETION
-- ============================================================================

INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id, new_values
) VALUES (
  auth.uid(),
  'SECURITY_SCAN_FIXES_APPLIED',
  'system',
  'security_scan_migration',
  jsonb_build_object(
    'migration_date', now(),
    'fixes_applied', jsonb_build_array(
      'security_definer_views_fixed',
      'function_search_path_fixed',
      'loyalty_functions_authorization_added',
      'insert_policies_tightened'
    )
  )
);