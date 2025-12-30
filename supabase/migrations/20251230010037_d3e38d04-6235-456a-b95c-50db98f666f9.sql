-- Fix: Add explicit DENY policy for anonymous users on profiles table
-- This prevents any anonymous access attempts to sensitive PII

-- First, drop existing policies and recreate with stronger protection
DROP POLICY IF EXISTS "strict_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "strict_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "strict_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "deny_profile_delete" ON public.profiles;
DROP POLICY IF EXISTS "deny_anonymous_profiles_access" ON public.profiles;

-- Explicit DENY policy for anonymous users (restrictive - blocks before other policies)
CREATE POLICY "deny_anonymous_profiles_access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Stricter SELECT policy - requires authentication AND ownership
CREATE POLICY "strict_profile_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Stricter INSERT policy - requires authentication AND ownership
CREATE POLICY "strict_profile_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Stricter UPDATE policy - requires authentication AND ownership
CREATE POLICY "strict_profile_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Deny all deletes
CREATE POLICY "deny_profile_delete"
ON public.profiles
FOR DELETE
USING (false);

-- Allow admins to view profiles for customer support (read-only)
CREATE POLICY "admin_can_view_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin_user(auth.uid()));