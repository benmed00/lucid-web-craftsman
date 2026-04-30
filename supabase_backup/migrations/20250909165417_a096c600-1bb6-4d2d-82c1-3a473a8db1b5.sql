-- Fix security warnings: Function search path issues and other security improvements

-- Fix function search path issues for the two functions that were flagged
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

-- Add security configuration for enhanced protection
INSERT INTO public.security_config (setting_name, setting_value, description, created_by)
VALUES 
  ('newsletter_access_monitoring', 
   '{"enabled": true, "max_access_per_hour": 10, "alert_threshold": 5}'::jsonb,
   'Configuration for monitoring newsletter subscription access patterns',
   (SELECT auth.uid()))
ON CONFLICT (setting_name) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- Create index for better performance on newsletter security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_newsletter_access 
ON public.audit_logs (user_id, action, created_at) 
WHERE action = 'NEWSLETTER_ACCESS';

-- Add rate limiting for newsletter subscription operations
INSERT INTO public.security_config (setting_name, setting_value, description, created_by)
VALUES 
  ('newsletter_rate_limit', 
   '{"max_subscriptions_per_ip_per_hour": 5, "max_updates_per_user_per_day": 10}'::jsonb,
   'Rate limiting configuration for newsletter operations',
   (SELECT auth.uid()))
ON CONFLICT (setting_name) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();