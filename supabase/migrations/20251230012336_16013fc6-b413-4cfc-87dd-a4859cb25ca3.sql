
-- Drop the flawed restrictive policy that causes issues
DROP POLICY IF EXISTS "deny_anonymous_profiles_access" ON public.profiles;

-- Drop existing policies to rebuild properly
DROP POLICY IF EXISTS "strict_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "strict_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "strict_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "admin_can_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "deny_profile_delete" ON public.profiles;

-- Create helper function to check if user is truly authenticated (not anonymous)
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- Users can only view their OWN profile (truly authenticated only)
CREATE POLICY "users_can_view_own_profile" 
ON public.profiles 
FOR SELECT 
USING (
  is_authenticated_user() 
  AND auth.uid() = id
);

-- Users can only insert their OWN profile
CREATE POLICY "users_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  is_authenticated_user() 
  AND auth.uid() = id
);

-- Users can only update their OWN profile
CREATE POLICY "users_can_update_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (
  is_authenticated_user() 
  AND auth.uid() = id
)
WITH CHECK (
  is_authenticated_user() 
  AND auth.uid() = id
);

-- Admins can view profiles (using secure function that checks user_roles table)
CREATE POLICY "admins_can_view_all_profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin_user(auth.uid()));

-- Nobody can delete profiles directly (only via auth.users cascade)
CREATE POLICY "prevent_profile_deletion" 
ON public.profiles 
FOR DELETE 
USING (false);

-- Add comment explaining security design
COMMENT ON FUNCTION public.is_authenticated_user() IS 
'Security function: Returns true only for truly authenticated users (not anonymous). 
Checks both auth.uid() existence AND that is_anonymous flag is false.
Used to prevent anonymous Supabase users from accessing protected resources.';
