-- Phase 2: Enhanced Access Controls - Strengthen Admin Protection
-- Add explicit DELETE protection for admin_users table and enhance security

-- Drop existing policies to recreate them with stronger security
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can update admin users" ON public.admin_users;

-- Strengthen admin user management policies
-- 1. Only super admins can insert new admin users
CREATE POLICY "Super admins can insert admin users" ON public.admin_users
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'super-admin'
  )
);

-- 2. Only super admins can update admin users (including role changes)
CREATE POLICY "Super admins can update admin users" ON public.admin_users
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'super-admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() 
    AND role = 'super-admin'
  )
);

-- 3. Explicitly deny DELETE operations on admin_users - no one should be able to delete admin users
CREATE POLICY "Deny all delete operations on admin users" ON public.admin_users
FOR DELETE 
TO authenticated
USING (false);

-- 4. Add audit logging for admin operations
-- Create function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log admin user changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, 
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'CREATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(NEW), inet_client_addr(), 
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'UPDATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(OLD), to_jsonb(NEW), inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for admin audit logging
DROP TRIGGER IF EXISTS admin_audit_trigger ON public.admin_users;
CREATE TRIGGER admin_audit_trigger
AFTER INSERT OR UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();