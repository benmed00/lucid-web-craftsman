-- Continue Security Fixes: Update remaining functions and improve RLS policies

-- Update remaining functions with secure search_path
CREATE OR REPLACE FUNCTION public.detect_suspicious_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.detect_security_breach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.enhanced_audit_logger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.detect_payment_fraud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = 'public'
AS $$
DECLARE
    access_count integer;
    different_payments integer;
BEGIN
    -- Check for excessive payment data access in short time
    IF NEW.action LIKE '%SELECT%' AND NEW.resource_type = 'payments' THEN
        SELECT COUNT(*) INTO access_count
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = 'payments'
          AND action LIKE '%SELECT%'
          AND created_at > now() - interval '5 minutes';
        
        IF access_count > 20 THEN
            PERFORM public.log_security_event(
                'SUSPICIOUS_PAYMENT_ACCESS',
                'high',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'access_count', access_count,
                    'time_window', '5 minutes',
                    'detection_reason', 'Excessive payment data access'
                ),
                NEW.user_id
            );
        END IF;
        
        -- Check for access to many different payment records
        SELECT COUNT(DISTINCT resource_id) INTO different_payments
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = 'payments'
          AND action LIKE '%SELECT%'
          AND created_at > now() - interval '10 minutes';
        
        IF different_payments > 10 THEN
            PERFORM public.log_security_event(
                'PAYMENT_DATA_SCRAPING',
                'critical',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'payment_count', different_payments,
                    'time_window', '10 minutes',
                    'detection_reason', 'Potential payment data scraping attempt'
                ),
                NEW.user_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.init_loyalty_account(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Validate input
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User UUID cannot be null';
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
$$;

-- Fix newsletter subscription RLS policies to remove conflicting rules
DROP POLICY IF EXISTS "Deny public access to newsletter subscriptions" ON public.newsletter_subscriptions;

-- Create more secure policy for newsletter subscriptions
CREATE POLICY "Users can manage their newsletter subscription by email"
ON public.newsletter_subscriptions
FOR ALL
USING (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE users.id = auth.uid() 
        AND users.email = newsletter_subscriptions.email
      )
    ELSE 
      -- Allow anonymous users to insert subscriptions only
      auth.role() = 'anon' AND TG_OP = 'INSERT'
  END
)
WITH CHECK (
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 
      EXISTS (
        SELECT 1 FROM auth.users 
        WHERE users.id = auth.uid() 
        AND users.email = newsletter_subscriptions.email
      )
    ELSE 
      -- Allow anonymous subscription creation
      true
  END
);