-- Fix all remaining function search path security issues
-- This addresses the final security linter warnings about mutable search paths

-- Drop and recreate functions that have parameter name conflicts
DROP FUNCTION IF EXISTS public.log_security_event(text,text,jsonb,uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text DEFAULT 'medium'::text,
  details jsonb DEFAULT '{}'::jsonb,
  user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) VALUES (
    event_type, 
    severity, 
    COALESCE(user_id, auth.uid()),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    COALESCE(details, '{}'::jsonb)
  );
END;
$$;

-- Update remaining functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;