-- Fix function search path security issues
-- Update functions to have proper search_path settings

CREATE OR REPLACE FUNCTION public.enhanced_audit_logger()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.anonymize_sensitive_data(input_data jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb := input_data;
    sensitive_fields text[] := ARRAY['email', 'phone', 'address_line1', 'address_line2', 'first_name', 'last_name', 'ip_address'];
    field text;
BEGIN
    -- Anonymize sensitive fields
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            result := jsonb_set(result, ARRAY[field], to_jsonb('***REDACTED***'), false);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.detect_security_breach()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;