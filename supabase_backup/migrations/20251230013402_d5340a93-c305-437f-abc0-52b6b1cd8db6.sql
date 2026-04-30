-- =====================================================
-- AUDIT LOGS SECURITY ENHANCEMENT
-- =====================================================

-- 1. Create validation function for audit log insertions
CREATE OR REPLACE FUNCTION public.validate_audit_log_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_inserts integer;
  valid_actions text[] := ARRAY[
    'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
    'PROFILE_ACCESS', 'PROFILE_UPDATE',
    'ADMIN_USER_CREATED', 'ADMIN_USER_UPDATED', 'ADMIN_USERS_LIST_ACCESS',
    'CONTACT_MESSAGE_ACCESS', 'CONTACT_MESSAGES_BULK_QUERY', 'FULL_CONTACT_MESSAGE_ACCESS',
    'NEWSLETTER_ACCESS', 'ADMIN_NEWSLETTER_ACCESS', 'USER_NEWSLETTER_ACCESS',
    'ROLE_GRANTED', 'ROLE_REVOKED',
    'PAYMENT_DATA_ACCESS',
    'CREATE_ADMIN', 'UPDATE_ADMIN',
    'INSERT_admin_users', 'UPDATE_admin_users',
    'INSERT_products', 'UPDATE_products', 'DELETE_products',
    'INSERT_orders', 'UPDATE_orders',
    'EMERGENCY_CONTACT_DATA_LOCKDOWN', 'CONTACT_DATA_ACCESS_RESTORED',
    'CONTACT_SECURITY_MONITORING_ACCESS',
    'ADMIN_SECURITY_METRICS_ACCESSED'
  ];
BEGIN
  -- 1. Validate required fields
  IF NEW.action IS NULL OR NEW.action = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be null or empty';
  END IF;
  
  IF NEW.resource_type IS NULL OR NEW.resource_type = '' THEN
    RAISE EXCEPTION 'Audit log resource_type cannot be null or empty';
  END IF;

  -- 2. Validate action format (must be alphanumeric with underscores)
  IF NEW.action !~ '^[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Audit log action contains invalid characters';
  END IF;

  -- 3. Prevent future-dated entries
  IF NEW.created_at > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'Audit log entries cannot be future-dated';
  END IF;

  -- 4. Limit action length
  IF length(NEW.action) > 100 THEN
    RAISE EXCEPTION 'Audit log action exceeds maximum length';
  END IF;

  -- 5. Limit resource_type length
  IF length(NEW.resource_type) > 100 THEN
    RAISE EXCEPTION 'Audit log resource_type exceeds maximum length';
  END IF;

  -- 6. Rate limit: detect potential log flooding
  SELECT COUNT(*) INTO recent_inserts
  FROM public.audit_logs
  WHERE created_at > now() - interval '1 minute'
    AND (
      (user_id IS NOT NULL AND user_id = NEW.user_id) OR
      (ip_address IS NOT NULL AND ip_address = NEW.ip_address)
    );

  IF recent_inserts > 100 THEN
    -- Log security event but still allow the insert
    -- This prevents blocking legitimate operations while alerting on suspicious activity
    PERFORM public.log_security_event(
      'AUDIT_LOG_FLOODING_DETECTED',
      'critical',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'ip_address', NEW.ip_address::text,
        'recent_inserts', recent_inserts,
        'time_window', '1 minute',
        'detection_reason', 'Potential audit log flooding attack'
      ),
      NEW.user_id
    );
  END IF;

  -- 7. Sanitize user_agent to prevent injection
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent := LEFT(NEW.user_agent, 500);
  END IF;

  -- 8. Ensure created_at is set to now() if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create trigger for audit log validation
DROP TRIGGER IF EXISTS validate_audit_log_trigger ON public.audit_logs;
CREATE TRIGGER validate_audit_log_trigger
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_log_entry();

-- 3. Add constraints for additional protection
ALTER TABLE public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_action_check;
  
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_action_check 
  CHECK (action ~ '^[A-Za-z0-9_]+$' AND length(action) <= 100);

ALTER TABLE public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_resource_type_check;
  
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_resource_type_check 
  CHECK (resource_type ~ '^[A-Za-z0-9_]+$' AND length(resource_type) <= 100);

-- 4. Create function to detect audit log tampering attempts
CREATE OR REPLACE FUNCTION public.monitor_audit_log_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  total_logs integer;
  recent_logs_1h integer;
  flooding_events integer;
  suspicious_patterns integer;
BEGIN
  -- Only super_admins can view these metrics
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT COUNT(*) INTO total_logs FROM public.audit_logs;
  
  SELECT COUNT(*) INTO recent_logs_1h 
  FROM public.audit_logs 
  WHERE created_at > now() - interval '1 hour';
  
  SELECT COUNT(*) INTO flooding_events
  FROM public.security_events
  WHERE event_type = 'AUDIT_LOG_FLOODING_DETECTED'
    AND created_at > now() - interval '24 hours';
    
  -- Check for suspicious patterns (same action repeated many times by same user)
  SELECT COUNT(*) INTO suspicious_patterns
  FROM (
    SELECT user_id, action, COUNT(*) as cnt
    FROM public.audit_logs
    WHERE created_at > now() - interval '1 hour'
    GROUP BY user_id, action
    HAVING COUNT(*) > 50
  ) suspicious;

  result := jsonb_build_object(
    'total_logs', total_logs,
    'recent_logs_1h', recent_logs_1h,
    'flooding_events_24h', flooding_events,
    'suspicious_patterns_1h', suspicious_patterns,
    'integrity_status', CASE 
      WHEN flooding_events > 0 OR suspicious_patterns > 0 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'checked_at', now()
  );

  RETURN result;
END;
$$;