-- Phase 4: Enhanced Monitoring & Logging
-- Create comprehensive security event logging system

-- Create security events table for monitoring suspicious activities
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  event_data jsonb NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT 
TO authenticated
USING (is_admin_user(auth.uid()));

-- System can insert security events
CREATE POLICY "System can insert security events" ON public.security_events
FOR INSERT 
WITH CHECK (true);

-- Admins can update security events (for resolution tracking)
CREATE POLICY "Admins can update security events" ON public.security_events
FOR UPDATE 
TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text DEFAULT 'medium',
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) VALUES (
    p_event_type, 
    p_severity, 
    COALESCE(p_user_id, auth.uid()),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_event_data
  );
END;
$$;

-- Create function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures integer;
  different_ips integer;
BEGIN
  -- Check for multiple failed logins from same IP in last hour
  SELECT COUNT(*) INTO recent_failures
  FROM public.audit_logs
  WHERE action = 'FAILED_LOGIN'
    AND ip_address = inet_client_addr()
    AND created_at > now() - interval '1 hour';
  
  IF recent_failures >= 5 THEN
    PERFORM public.log_security_event(
      'SUSPICIOUS_LOGIN_PATTERN',
      'high',
      jsonb_build_object(
        'recent_failures', recent_failures,
        'ip_address', inet_client_addr(),
        'detection_reason', 'Multiple failed logins from same IP'
      )
    );
  END IF;
  
  -- Check for logins from multiple IPs for same user in short time
  IF TG_OP = 'INSERT' AND NEW.action = 'LOGIN' THEN
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM public.audit_logs
    WHERE user_id = NEW.user_id
      AND action = 'LOGIN'
      AND created_at > now() - interval '10 minutes';
    
    IF different_ips >= 3 THEN
      PERFORM public.log_security_event(
        'MULTIPLE_IP_LOGIN',
        'medium',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'ip_count', different_ips,
          'detection_reason', 'Logins from multiple IPs in short timeframe'
        ),
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for suspicious activity detection
DROP TRIGGER IF EXISTS detect_suspicious_activity ON public.audit_logs;
CREATE TRIGGER detect_suspicious_activity
  AFTER INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.detect_suspicious_login();

-- Create indexes for performance on security monitoring queries
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_detected_at ON public.security_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON public.audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address_created_at ON public.audit_logs(ip_address, created_at);