-- =====================================================
-- ADMIN_USERS TABLE SECURITY MONITORING ENHANCEMENT
-- =====================================================

-- 1. Create trigger function to monitor admin_users modifications
CREATE OR REPLACE FUNCTION public.monitor_admin_users_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log all modifications to admin_users table
  IF TG_OP = 'INSERT' THEN
    -- Log new admin creation
    PERFORM public.log_security_event(
      'ADMIN_USER_CREATED',
      'high',
      jsonb_build_object(
        'admin_email', NEW.email,
        'admin_role', NEW.role,
        'created_by', auth.uid(),
        'operation', TG_OP
      ),
      auth.uid()
    );
    
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ADMIN_USER_CREATED',
      'admin_users',
      NEW.id::text,
      jsonb_build_object(
        'email', public.mask_email(NEW.email),
        'role', NEW.role,
        'name', NEW.name
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log admin modification with special alert for role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.log_security_event(
        'ADMIN_ROLE_CHANGED',
        'critical',
        jsonb_build_object(
          'admin_email', public.mask_email(NEW.email),
          'old_role', OLD.role,
          'new_role', NEW.role,
          'changed_by', auth.uid()
        ),
        auth.uid()
      );
    END IF;
    
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ADMIN_USER_UPDATED',
      'admin_users',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'email', public.mask_email(OLD.email)),
      jsonb_build_object('role', NEW.role, 'email', public.mask_email(NEW.email)),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create trigger for admin_users monitoring
DROP TRIGGER IF EXISTS monitor_admin_users_trigger ON public.admin_users;
CREATE TRIGGER monitor_admin_users_trigger
  AFTER INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_admin_users_access();

-- 3. Create secure function to access admin users with logging
CREATE OR REPLACE FUNCTION public.get_admin_users_secure()
RETURNS TABLE(
  id uuid,
  email text,
  name text,
  role text,
  last_login timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Only super_admins can access this data
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'UNAUTHORIZED_ADMIN_LIST_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'attempted_action', 'get_admin_users_secure',
        'access_time', now(),
        'detection_reason', 'Non-super-admin attempted to access admin user list'
      ),
      auth.uid()
    );
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Check for suspicious access patterns
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'ADMIN_USERS_LIST_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Alert on excessive access
  IF access_count > 10 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_ADMIN_LIST_ACCESS',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Suspicious admin user list access pattern'
      ),
      auth.uid()
    );
  END IF;

  -- Log successful access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'ADMIN_USERS_LIST_ACCESS',
    'admin_users',
    'list_query',
    jsonb_build_object(
      'access_time', now(),
      'previous_access_count_1hour', access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return admin users data
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.name,
    au.role,
    au.last_login,
    au.created_at
  FROM public.admin_users au
  ORDER BY au.created_at DESC;
END;
$$;

-- 4. Create function to monitor admin table access health
CREATE OR REPLACE FUNCTION public.get_admin_access_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  total_admins integer;
  access_events_24h integer;
  unauthorized_attempts_24h integer;
  unique_accessors_7d integer;
BEGIN
  -- Only super_admins can view these metrics
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get metrics
  SELECT COUNT(*) INTO total_admins FROM public.admin_users;
  
  SELECT COUNT(*) INTO access_events_24h
  FROM public.audit_logs
  WHERE action LIKE '%ADMIN_USER%'
    AND created_at > now() - interval '24 hours';
    
  SELECT COUNT(*) INTO unauthorized_attempts_24h
  FROM public.security_events
  WHERE event_type = 'UNAUTHORIZED_ADMIN_LIST_ACCESS'
    AND created_at > now() - interval '24 hours';
    
  SELECT COUNT(DISTINCT user_id) INTO unique_accessors_7d
  FROM public.audit_logs
  WHERE action LIKE '%ADMIN_USER%'
    AND created_at > now() - interval '7 days';

  result := jsonb_build_object(
    'total_admins', total_admins,
    'access_events_24h', access_events_24h,
    'unauthorized_attempts_24h', unauthorized_attempts_24h,
    'unique_accessors_7d', unique_accessors_7d,
    'risk_level', CASE 
      WHEN unauthorized_attempts_24h > 5 THEN 'CRITICAL'
      WHEN unauthorized_attempts_24h > 0 THEN 'HIGH'
      WHEN access_events_24h > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'generated_at', now()
  );

  -- Log metrics access
  PERFORM public.log_security_event(
    'ADMIN_SECURITY_METRICS_ACCESSED',
    'low',
    jsonb_build_object('metrics', result),
    auth.uid()
  );

  RETURN result;
END;
$$;