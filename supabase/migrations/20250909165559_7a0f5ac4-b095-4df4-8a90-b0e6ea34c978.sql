-- Final check and fix for remaining function search path issue

-- Check specific functions that might still need search_path
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for status changes on significant statuses
  IF NEW.status IS DISTINCT FROM OLD.status 
     AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered', 'cancelled') 
     AND OLD.status != NEW.status THEN
    
    -- Call the edge function to send notification
    PERFORM
      net.http_post(
        url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/send-order-notification-improved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
        ),
        body := jsonb_build_object(
          'order_id', NEW.id::text,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure enhanced_audit_logger has proper search_path
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

-- Add documentation about remaining security configurations needed
COMMENT ON FUNCTION public.enhanced_audit_logger() IS 'Audit logging function with proper security definer and search path settings';

-- Log completion of database security hardening
INSERT INTO public.security_events (
  event_type, 
  severity, 
  event_data,
  user_id
) VALUES (
  'DATABASE_SECURITY_HARDENING_COMPLETE',
  'low',
  jsonb_build_object(
    'functions_secured', true,
    'rls_policies_updated', true,
    'newsletter_protection_enabled', true,
    'next_steps', ARRAY['Configure Auth OTP expiry', 'Enable leaked password protection', 'Upgrade Postgres version'],
    'timestamp', now()
  ),
  auth.uid()
);