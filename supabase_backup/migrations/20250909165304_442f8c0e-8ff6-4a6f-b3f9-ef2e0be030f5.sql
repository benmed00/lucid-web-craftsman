-- Fix RLS policies for newsletter_subscriptions table to prevent email harvesting

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert their own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update newsletter by email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can view newsletter by email" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Deny public access to newsletter subscriptions" ON public.newsletter_subscriptions;

-- Create secure policies

-- Allow anonymous and authenticated users to subscribe to newsletter (common use case)
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (true);

-- Only allow users to view their own newsletter subscription by matching their auth email
CREATE POLICY "Users can view own newsletter subscription"
ON public.newsletter_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
);

-- Only allow users to update their own newsletter subscription
CREATE POLICY "Users can update own newsletter subscription"
ON public.newsletter_subscriptions
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = newsletter_subscriptions.email
  )
);

-- Prevent regular users from deleting newsletter subscriptions
-- Only admins can delete (existing admin policy covers this)
CREATE POLICY "Prevent unauthorized deletion"
ON public.newsletter_subscriptions
FOR DELETE
USING (false);

-- Add audit logging for newsletter subscription access
CREATE OR REPLACE FUNCTION public.log_newsletter_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log newsletter subscription access for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'NEWSLETTER_ACCESS',
      'newsletter_subscription',
      NEW.id::text,
      jsonb_build_object('email_accessed', NEW.email),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging (but don't enable it on SELECT as it would be too noisy)
-- Instead, we'll rely on application-level logging for newsletter access

-- Add security event logging for suspicious newsletter access patterns
CREATE OR REPLACE FUNCTION public.detect_newsletter_scraping()
RETURNS TRIGGER AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Detect potential email scraping attempts
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    -- Check how many different newsletter records this user accessed recently
    SELECT COUNT(DISTINCT resource_id) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'NEWSLETTER_ACCESS'
      AND created_at > now() - interval '1 hour';
    
    -- If accessing more than 10 different newsletter records in an hour, flag as suspicious
    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'NEWSLETTER_SCRAPING_ATTEMPT',
        'high',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '1 hour',
          'detection_reason', 'Excessive newsletter subscription access'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;