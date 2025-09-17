-- Continue fixing more function search path security issues

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_action_type text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_attempts integer := 0;
    window_start_time timestamp with time zone;
BEGIN
    -- Validate input parameters
    IF p_identifier IS NULL OR p_action_type IS NULL THEN
        RAISE EXCEPTION 'Identifier and action type cannot be null';
    END IF;
    
    IF p_max_attempts < 1 OR p_window_minutes < 1 THEN
        RAISE EXCEPTION 'Max attempts and window minutes must be positive';
    END IF;

    -- Clean up old entries (older than window)
    DELETE FROM public.rate_limits 
    WHERE window_start < now() - (p_window_minutes || ' minutes')::interval;

    -- Get current attempts for this identifier and action
    SELECT attempts, window_start INTO current_attempts, window_start_time
    FROM public.rate_limits
    WHERE identifier = p_identifier AND action_type = p_action_type;

    -- If no record exists, create one
    IF current_attempts IS NULL THEN
        INSERT INTO public.rate_limits (identifier, action_type, attempts, window_start)
        VALUES (p_identifier, p_action_type, 1, now())
        ON CONFLICT (identifier, action_type) 
        DO UPDATE SET 
            attempts = rate_limits.attempts + 1,
            created_at = now();
        RETURN true;
    END IF;

    -- Check if we're still within the window
    IF window_start_time > now() - (p_window_minutes || ' minutes')::interval THEN
        -- Within window, check if limit exceeded
        IF current_attempts >= p_max_attempts THEN
            RETURN false; -- Rate limit exceeded
        ELSE
            -- Increment attempts
            UPDATE public.rate_limits 
            SET attempts = attempts + 1, created_at = now()
            WHERE identifier = p_identifier AND action_type = p_action_type;
            RETURN true;
        END IF;
    ELSE
        -- Window expired, reset counter
        UPDATE public.rate_limits 
        SET attempts = 1, window_start = now(), created_at = now()
        WHERE identifier = p_identifier AND action_type = p_action_type;
        RETURN true;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_newsletter_scraping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.detect_payment_fraud()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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