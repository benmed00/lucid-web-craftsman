
-- 1. Update verify_admin_session() to use user_roles (consistent with RLS)
CREATE OR REPLACE FUNCTION public.verify_admin_session()
RETURNS TABLE(is_admin boolean, admin_role text, admin_name text, admin_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id uuid;
    v_is_admin boolean := false;
    v_role text := null;
    v_name text := null;
    v_email text := null;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, null::text, null::text, null::text;
        RETURN;
    END IF;
    
    -- Check user_roles table (single source of truth for RBAC)
    SELECT 
        true,
        ur.role::text
    INTO v_is_admin, v_role
    FROM user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role IN ('admin', 'super_admin')
      AND ur.revoked_at IS NULL
    ORDER BY CASE ur.role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
    END
    LIMIT 1;
    
    -- Get name/email from admin_users if exists (display only)
    IF v_is_admin THEN
        SELECT au.name, au.email
        INTO v_name, v_email
        FROM admin_users au
        WHERE au.user_id = v_user_id;
    END IF;
    
    RETURN QUERY SELECT 
        COALESCE(v_is_admin, false),
        v_role,
        COALESCE(v_name, ''::text),
        COALESCE(v_email, ''::text);
END;
$function$;

-- 2. Create get_user_role() for frontend role detection
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT role::text
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND revoked_at IS NULL
      ORDER BY CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END
      LIMIT 1
    ),
    CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'anonymous' END
  )
$$;
