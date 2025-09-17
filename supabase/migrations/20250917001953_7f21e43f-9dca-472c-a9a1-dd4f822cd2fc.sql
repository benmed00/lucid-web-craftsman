-- Fix function parameter conflict using CASCADE
-- This addresses the final security linter warnings about mutable search paths

-- Drop and recreate is_admin_user function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.is_admin_user(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = $1 
    AND admin_users.role IN ('admin', 'super-admin')
  );
$$;

-- Update remaining functions to have immutable search paths
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

CREATE OR REPLACE FUNCTION public.mask_email(email_address text)
RETURNS text
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE 
    WHEN email_address IS NULL OR email_address = '' THEN ''
    WHEN position('@' in email_address) = 0 THEN email_address
    ELSE 
      substring(email_address from 1 for 2) || 
      repeat('*', greatest(0, position('@' in email_address) - 3)) ||
      substring(email_address from position('@' in email_address))
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  
  -- Initialize loyalty account
  PERFORM public.init_loyalty_account(NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type text,
  resource_type text,
  resource_id text,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    old_values, new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    action_type,
    resource_type,
    resource_id,
    old_values,
    new_values,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;