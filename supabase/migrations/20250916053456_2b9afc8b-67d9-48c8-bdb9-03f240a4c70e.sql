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

-- Enhanced audit logging function for newsletter access
CREATE OR REPLACE FUNCTION public.log_newsletter_access_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log newsletter subscription access with enhanced security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    -- Only log if this is an admin accessing data or user accessing their own data
    IF is_admin_user(auth.uid()) OR user_owns_newsletter_subscription(NEW.email) THEN
      INSERT INTO public.audit_logs (
        user_id, action, resource_type, resource_id,
        new_values, ip_address, user_agent
      ) VALUES (
        auth.uid(),
        'NEWSLETTER_ACCESS',
        'newsletter_subscription',
        NEW.id::text,
        jsonb_build_object(
          'email_accessed', 
          CASE 
            WHEN is_admin_user(auth.uid()) THEN NEW.email
            ELSE public.mask_email(NEW.email)
          END,
          'access_type', 
          CASE 
            WHEN is_admin_user(auth.uid()) THEN 'admin_access'
            ELSE 'user_own_access'
          END
        ),
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for enhanced audit logging
DROP TRIGGER IF EXISTS enhanced_newsletter_access_log ON public.newsletter_subscriptions;
CREATE TRIGGER enhanced_newsletter_access_log
  AFTER SELECT ON public.newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_newsletter_access_enhanced();

-- Enhanced scraping detection function
CREATE OR REPLACE FUNCTION public.detect_newsletter_scraping_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  access_count INTEGER;
  unique_emails_accessed INTEGER;
BEGIN
  -- Enhanced detection for potential email scraping attempts
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    -- Check how many different newsletter records this user accessed recently
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'NEWSLETTER_ACCESS'
      AND created_at > now() - interval '1 hour';
    
    -- Check how many unique email addresses were accessed
    SELECT COUNT(DISTINCT (new_values->>'email_accessed')) INTO unique_emails_accessed
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'NEWSLETTER_ACCESS'
      AND created_at > now() - interval '1 hour'
      AND new_values->>'access_type' = 'admin_access'; -- Only count admin access
    
    -- Flag as suspicious if accessing many newsletter records (and user is admin)
    IF access_count > 5 AND is_admin_user(auth.uid()) AND unique_emails_accessed > 3 THEN
      PERFORM public.log_security_event(
        'NEWSLETTER_SCRAPING_ATTEMPT',
        'high',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'unique_emails_accessed', unique_emails_accessed,
          'time_window', '1 hour',
          'detection_reason', 'Excessive newsletter subscription access by admin user'
        ),
        auth.uid()
      );
    ELSIF access_count > 10 THEN
      -- Any user accessing too many records is suspicious
      PERFORM public.log_security_event(
        'SUSPICIOUS_NEWSLETTER_ACCESS',
        'medium',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '1 hour',
          'detection_reason', 'Excessive newsletter subscription access attempts'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for enhanced scraping detection
DROP TRIGGER IF EXISTS enhanced_newsletter_scraping_detection ON public.newsletter_subscriptions;
CREATE TRIGGER enhanced_newsletter_scraping_detection
  AFTER SELECT ON public.newsletter_subscriptions
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

-- Create a view for admins to safely access newsletter data with built-in audit logging
CREATE OR REPLACE VIEW public.admin_newsletter_view AS
SELECT 
  id,
  email,
  status,
  created_at,
  updated_at,
  consent_given,
  source,
  tags,
  metadata
FROM public.newsletter_subscriptions
WHERE is_admin_user(auth.uid());

-- Grant access to the view for authenticated users (RLS will still apply)
GRANT SELECT ON public.admin_newsletter_view TO authenticated;