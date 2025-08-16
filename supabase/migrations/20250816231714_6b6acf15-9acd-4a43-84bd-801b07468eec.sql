-- Phase 5: Additional Security Enhancements
-- Add audit logging for all sensitive table operations

-- Enhanced audit logging trigger for sensitive operations
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add enhanced audit triggers to sensitive tables
DROP TRIGGER IF EXISTS enhanced_audit_payments ON public.payments;
CREATE TRIGGER enhanced_audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_logger();

DROP TRIGGER IF EXISTS enhanced_audit_shipping_addresses ON public.shipping_addresses;
CREATE TRIGGER enhanced_audit_shipping_addresses
    AFTER INSERT OR UPDATE OR DELETE ON public.shipping_addresses
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_logger();

DROP TRIGGER IF EXISTS enhanced_audit_admin_users ON public.admin_users;
CREATE TRIGGER enhanced_audit_admin_users
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.enhanced_audit_logger();

-- Data anonymization function for sensitive data in logs
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Security breach detection function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add breach detection trigger
DROP TRIGGER IF EXISTS detect_security_breach_trigger ON public.audit_logs;
CREATE TRIGGER detect_security_breach_trigger
    AFTER INSERT ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.detect_security_breach();

-- Create security configuration table for admin settings
CREATE TABLE IF NOT EXISTS public.security_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_name text NOT NULL UNIQUE,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid
);

-- Enable RLS on security_config
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage security config
CREATE POLICY "Super admins can manage security config"
    ON public.security_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND role = 'super-admin'
        )
    );

-- Insert default security configurations
INSERT INTO public.security_config (setting_name, setting_value, description) VALUES
    ('max_login_attempts', '5', 'Maximum failed login attempts before account lockout'),
    ('lockout_duration_minutes', '30', 'Account lockout duration in minutes'),
    ('session_timeout_minutes', '60', 'Session timeout in minutes'),
    ('password_min_length', '12', 'Minimum password length'),
    ('require_mfa_for_admin', 'true', 'Require multi-factor authentication for admin accounts'),
    ('log_retention_days', '90', 'Number of days to retain audit logs'),
    ('suspicious_login_threshold', '3', 'Number of different IPs in 10 minutes that triggers alert')
ON CONFLICT (setting_name) DO NOTHING;

-- Function to get security settings
CREATE OR REPLACE FUNCTION public.get_security_setting(setting_key text)
RETURNS jsonb AS $$
DECLARE
    setting_val jsonb;
BEGIN
    SELECT setting_value INTO setting_val
    FROM public.security_config
    WHERE setting_name = setting_key;
    
    RETURN COALESCE(setting_val, 'null'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;