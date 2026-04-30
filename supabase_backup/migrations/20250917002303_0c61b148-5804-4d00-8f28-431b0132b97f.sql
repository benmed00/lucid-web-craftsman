-- Continue fixing all remaining function search path security issues

CREATE OR REPLACE FUNCTION public.detect_security_breach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    recent_failures integer;
    unusual_access integer;
BEGIN
    -- Check for potential data breach indicators
    IF NEW.action LIKE '%SELECT%' AND NEW.resource_type IN ('payments', 'shipping_addresses', 'admin_users') THEN
        -- Check for unusual access patterns
        SELECT COUNT(*) INTO unusual_access
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = NEW.resource_type
          AND created_at > now() - interval '5 minutes'
          AND action LIKE '%SELECT%';
        
        IF unusual_access > 10 THEN
            PERFORM public.log_security_event(
                'SUSPICIOUS_DATA_ACCESS',
                'high',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'resource_type', NEW.resource_type,
                    'access_count', unusual_access,
                    'time_window', '5 minutes'
                ),
                NEW.user_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_suspicious_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.enhanced_audit_logger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Log all operations on sensitive tables
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id, 
            new_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(NEW.id::text, 'unknown'),
            to_jsonb(NEW), 
            inet_client_addr(), 
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(NEW.id::text, OLD.id::text, 'unknown'),
            to_jsonb(OLD), 
            to_jsonb(NEW), 
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id, 
            old_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(OLD.id::text, 'unknown'),
            to_jsonb(OLD), 
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_segments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result jsonb;
  total_customers integer := 0;
  new_customers integer := 0;
  repeat_customers integer := 0;
  at_risk_customers integer := 0;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total customers from profiles
  SELECT COUNT(*) INTO total_customers FROM public.profiles;
  
  -- Get new customers (registered in last 30 days)
  SELECT COUNT(*) INTO new_customers 
  FROM public.profiles 
  WHERE created_at >= now() - interval '30 days';
  
  -- Get repeat customers (have more than 1 order)
  SELECT COUNT(*) INTO repeat_customers
  FROM (
    SELECT user_id
    FROM public.orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS repeats;
  
  -- Get at-risk customers (no orders in last 90 days but had orders before)
  SELECT COUNT(*) INTO at_risk_customers
  FROM (
    SELECT user_id
    FROM public.orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING MAX(created_at) < now() - interval '90 days'
  ) AS at_risk;

  result := jsonb_build_object(
    'total', total_customers,
    'new', new_customers,
    'returning', repeat_customers,
    'at_risk', at_risk_customers
  );

  RETURN result;
END;
$$;