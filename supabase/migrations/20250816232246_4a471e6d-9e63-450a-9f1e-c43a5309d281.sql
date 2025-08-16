-- Fix remaining function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;