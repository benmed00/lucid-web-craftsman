-- Fix: Strengthen user_preferences RLS with direct user_id comparison
-- Remove subquery-based validation and use direct auth.uid() = user_id check

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "deny_anonymous_preferences_access" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_select" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_update" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_delete" ON public.user_preferences;
DROP POLICY IF EXISTS "admin_preferences_view" ON public.user_preferences;

-- Explicit DENY policy for anonymous users (restrictive - blocks before other policies)
CREATE POLICY "deny_anonymous_preferences_access"
ON public.user_preferences
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Direct user_id comparison for SELECT (no subquery)
CREATE POLICY "strict_preferences_select"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Direct user_id comparison for INSERT
CREATE POLICY "strict_preferences_insert"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Direct user_id comparison for UPDATE
CREATE POLICY "strict_preferences_update"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Direct user_id comparison for DELETE
CREATE POLICY "strict_preferences_delete"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view preferences for support purposes (read-only)
CREATE POLICY "admin_preferences_view"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (is_admin_user(auth.uid()));