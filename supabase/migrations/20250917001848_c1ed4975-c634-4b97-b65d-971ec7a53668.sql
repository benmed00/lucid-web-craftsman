-- Fix remaining function search path security issues
-- This addresses the final security linter warnings about mutable search paths

-- Update functions to have immutable search paths
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE admins.user_id = $1 
    AND admins.active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  severity text,
  details jsonb,
  user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent, severity
  ) VALUES (
    COALESCE(user_id, auth.uid()),
    'SECURITY_EVENT',
    'security',
    event_type,
    jsonb_build_object(
      'event_type', event_type,
      'severity', severity,
      'details', details,
      'timestamp', now()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    severity
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
    user_id,
    display_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  
  -- Initialize loyalty account
  INSERT INTO public.loyalty_accounts (
    user_id,
    points_balance,
    tier,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    0,
    'bronze',
    NOW(),
    NOW()
  );
  
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