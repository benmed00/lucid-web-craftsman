-- ====================================
-- CRITICAL SECURITY FIX: Proper Role Architecture
-- ====================================
-- This migration fixes the privilege escalation vulnerability by:
-- 1. Creating separate user_roles table
-- 2. Migrating existing admin_users data
-- 3. Implementing secure role checking functions
-- 4. Updating RLS policies

-- Step 1: Create role enum
CREATE TYPE app_role AS ENUM ('user', 'admin', 'super_admin');

-- Step 2: Create user_roles table with proper audit trail
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  notes TEXT,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security definer function (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
      AND revoked_at IS NULL
  )
$$;

-- Helper function to check if user is admin (any admin role)
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role IN ('admin', 'super_admin')
      AND revoked_at IS NULL
  )
$$;

-- Step 4: Migrate existing admin_users data to user_roles
INSERT INTO public.user_roles (user_id, role, granted_at, notes)
SELECT 
  user_id,
  CASE 
    WHEN role = 'super-admin' THEN 'super_admin'::app_role
    ELSE 'admin'::app_role
  END,
  created_at,
  'Migrated from admin_users table'
FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can grant roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can revoke roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Prevent role deletion"
ON public.user_roles
FOR DELETE
USING (false);

-- Step 6: Update is_admin_user function to use new architecture
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_user_admin(user_uuid)
$$;

-- Step 7: Create role change audit trigger
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ROLE_GRANTED',
      'user_role',
      NEW.id::TEXT,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'granted_by', NEW.granted_by
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ROLE_REVOKED',
      'user_role',
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_role_changes_trigger
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();

-- Step 8: Add indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_user_roles_role ON public.user_roles(role) WHERE revoked_at IS NULL;

-- Step 9: Add helpful comments
COMMENT ON TABLE public.user_roles IS 'Secure role management table - roles stored separately from user identity to prevent privilege escalation';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles - prevents RLS recursion issues';
COMMENT ON FUNCTION public.is_user_admin IS 'Helper function to check if user has any admin role';

-- Step 10: Log the migration
INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id, new_values
) VALUES (
  auth.uid(),
  'SECURITY_MIGRATION_APPLIED',
  'system',
  'role_architecture_fix',
  jsonb_build_object(
    'migration', 'secure_role_architecture',
    'timestamp', NOW(),
    'description', 'Fixed critical privilege escalation vulnerability by implementing proper role separation'
  )
);

-- Note: admin_users table is kept for backward compatibility
-- It now stores only metadata (email, name, last_login)
-- Actual authorization uses user_roles table
COMMENT ON TABLE public.admin_users IS 'DEPRECATED for authorization - use user_roles table. This table now stores only admin metadata.';