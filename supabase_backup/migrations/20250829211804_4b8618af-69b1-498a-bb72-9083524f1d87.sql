-- Final security fixes - check existing policies and update functions only
-- Update remaining database functions with secure search_path and input validation

CREATE OR REPLACE FUNCTION public.get_security_setting(setting_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    setting_val jsonb;
BEGIN
    -- Validate input
    IF setting_key IS NULL OR setting_key = '' THEN
        RAISE EXCEPTION 'Setting key cannot be null or empty';
    END IF;

    SELECT setting_value INTO setting_val
    FROM public.security_config
    WHERE setting_name = setting_key;
    
    RETURN COALESCE(setting_val, 'null'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_sensitive_data(input_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
    result jsonb := input_data;
    sensitive_fields text[] := ARRAY['email', 'phone', 'address_line1', 'address_line2', 'first_name', 'last_name', 'ip_address'];
    field text;
BEGIN
    -- Validate input
    IF input_data IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Anonymize sensitive fields
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            result := jsonb_set(result, ARRAY[field], to_jsonb('***REDACTED***'), false);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;

-- Add input validation to existing security functions
CREATE OR REPLACE FUNCTION public.get_masked_payment_info(payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    payment_record jsonb;
    user_owns_payment boolean;
    is_super_admin boolean;
BEGIN
    -- Validate input
    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Payment ID cannot be null';
    END IF;

    -- Check if user owns this payment
    SELECT EXISTS (
        SELECT 1 FROM public.payments p
        JOIN public.orders o ON p.order_id = o.id
        WHERE p.id = payment_id AND o.user_id = auth.uid()
    ) INTO user_owns_payment;
    
    -- Check if user is super admin
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'super-admin'
    ) INTO is_super_admin;
    
    -- Only allow access if user owns payment or is super admin
    IF NOT (user_owns_payment OR is_super_admin) THEN
        RAISE EXCEPTION 'Access denied to payment information';
    END IF;
    
    -- Get payment record
    SELECT to_jsonb(p.*) INTO payment_record
    FROM public.payments p
    WHERE p.id = payment_id;
    
    -- For regular users, mask sensitive fields
    IF user_owns_payment AND NOT is_super_admin THEN
        payment_record := jsonb_set(
            payment_record, 
            '{stripe_payment_intent_id}', 
            to_jsonb('pi_****' || right(payment_record->>'stripe_payment_intent_id', 4))
        );
        payment_record := jsonb_set(
            payment_record, 
            '{stripe_payment_method_id}', 
            to_jsonb('pm_****' || right(payment_record->>'stripe_payment_method_id', 4))
        );
        -- Remove sensitive metadata
        payment_record := payment_record - 'metadata';
    END IF;
    
    -- Log access to payment data
    PERFORM public.log_security_event(
        'PAYMENT_DATA_ACCESS',
        CASE WHEN is_super_admin THEN 'medium' ELSE 'low' END,
        jsonb_build_object(
            'payment_id', payment_id,
            'user_type', CASE WHEN is_super_admin THEN 'super_admin' ELSE 'customer' END,
            'masked', NOT is_super_admin
        ),
        auth.uid()
    );
    
    RETURN payment_record;
END;
$$;

-- Add a rate limiting table to prevent abuse
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    action_type text NOT NULL,
    attempts integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(identifier, action_type)
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Admins can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- System can insert rate limits
CREATE POLICY "System can insert rate limits" 
ON public.rate_limits 
FOR INSERT 
WITH CHECK (true);

-- Add enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_action_type text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 60)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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