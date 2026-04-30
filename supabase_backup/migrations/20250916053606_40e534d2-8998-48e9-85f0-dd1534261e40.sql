-- Security Fix: Restrict access to newsletter subscriptions
-- This migration addresses the security vulnerability where customer email addresses 
-- could be harvested by competitors or spammers

-- First, let's drop existing problematic policies and recreate them with stricter controls
DROP POLICY IF EXISTS "Admins can view all newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;

-- Create a security definer function to safely check if a user owns a newsletter subscription
CREATE OR REPLACE FUNCTION public.user_owns_newsletter_subscription(subscription_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = subscription_email
  );
$$;

-- Strict policy: Only admins can view all newsletter subscriptions
CREATE POLICY "Admins can view all newsletter subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
TO authenticated
USING (is_admin_user(auth.uid()));

-- Users can only view their own newsletter subscription by email match
CREATE POLICY "Users can view own newsletter subscription by email"
ON public.newsletter_subscriptions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_owns_newsletter_subscription(email)
);

-- Users can only update their own newsletter subscription
CREATE POLICY "Users can update own newsletter subscription"
ON public.newsletter_subscriptions
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND user_owns_newsletter_subscription(email)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_owns_newsletter_subscription(email)
);

-- Allow newsletter subscription (but with rate limiting in application)
CREATE POLICY "Authenticated users can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow anonymous newsletter subscription but with additional security
CREATE POLICY "Anonymous users can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
TO anon
WITH CHECK (
  -- Only allow if email is being inserted and follows basic email format
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Enhanced scraping detection function for INSERT/UPDATE operations
CREATE OR REPLACE FUNCTION public.detect_newsletter_scraping_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Enhanced detection for potential newsletter manipulation
  IF TG_OP IN ('INSERT', 'UPDATE') AND auth.uid() IS NOT NULL THEN
    -- Check how many newsletter operations this user performed recently
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action LIKE '%NEWSLETTER%'
      AND created_at > now() - interval '1 hour';
    
    -- Flag as suspicious if too many operations
    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'SUSPICIOUS_NEWSLETTER_ACTIVITY',
        'medium',
        jsonb_build_object(
          'user_id', auth.uid(),
          'operation_count', access_count,
          'time_window', '1 hour',
          'operation_type', TG_OP,
          'detection_reason', 'Excessive newsletter operations'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for enhanced scraping detection on INSERT/UPDATE
DROP TRIGGER IF EXISTS enhanced_newsletter_scraping_detection ON public.newsletter_subscriptions;
CREATE TRIGGER enhanced_newsletter_scraping_detection
  AFTER INSERT OR UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.detect_newsletter_scraping_enhanced();

-- Add additional security: Rate limiting for newsletter operations
INSERT INTO public.security_config (setting_name, setting_value, description)
VALUES (
  'newsletter_rate_limit',
  jsonb_build_object(
    'max_subscriptions_per_ip_per_hour', 5,
    'max_admin_access_per_hour', 50,
    'alert_threshold', 3
  ),
  'Rate limiting configuration for newsletter subscription operations'
) ON CONFLICT (setting_name) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Create a secure function for admins to access newsletter data with audit logging
CREATE OR REPLACE FUNCTION public.get_newsletter_subscriptions_admin()
RETURNS TABLE (
  id uuid,
  email text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  consent_given boolean,
  source text,
  tags text[],
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log admin access to newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'ADMIN_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'bulk_access',
    jsonb_build_object(
      'access_time', now(),
      'access_type', 'admin_function'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return newsletter subscriptions data
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags,
    ns.metadata
  FROM public.newsletter_subscriptions ns;
END;
$$;

-- Create a function for users to safely access their own newsletter subscription
CREATE OR REPLACE FUNCTION public.get_user_newsletter_subscription()
RETURNS TABLE (
  id uuid,
  email text,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  consent_given boolean,
  source text,
  tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found or not authenticated';
  END IF;

  -- Log user access to their own newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'USER_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'own_subscription',
    jsonb_build_object(
      'access_time', now(),
      'email_accessed', public.mask_email(user_email)
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return user's own newsletter subscription
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags
  FROM public.newsletter_subscriptions ns
  WHERE ns.email = user_email;
END;
$$;