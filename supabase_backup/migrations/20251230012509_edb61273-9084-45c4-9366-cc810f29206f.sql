
-- =====================================================
-- FIX 1: user_preferences table - remove flawed policy
-- =====================================================

-- Drop the flawed RESTRICTIVE policy and duplicate policies
DROP POLICY IF EXISTS "deny_anonymous_preferences_access" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_select" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_update" ON public.user_preferences;
DROP POLICY IF EXISTS "strict_preferences_delete" ON public.user_preferences;
DROP POLICY IF EXISTS "admin_preferences_view" ON public.user_preferences;

-- Create proper policies using is_authenticated_user()
CREATE POLICY "authenticated_users_can_view_own_preferences" 
ON public.user_preferences 
FOR SELECT 
USING (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (is_authenticated_user() AND auth.uid() = user_id)
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_preferences" 
ON public.user_preferences 
FOR DELETE 
USING (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "admins_can_view_all_preferences" 
ON public.user_preferences 
FOR SELECT 
USING (is_admin_user(auth.uid()));

-- =====================================================
-- FIX 2: notification_preferences table - add proper checks
-- =====================================================

DROP POLICY IF EXISTS "Users can manage their own notification preferences" ON public.notification_preferences;

CREATE POLICY "authenticated_users_can_view_own_notifications" 
ON public.notification_preferences 
FOR SELECT 
USING (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_insert_own_notifications" 
ON public.notification_preferences 
FOR INSERT 
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_update_own_notifications" 
ON public.notification_preferences 
FOR UPDATE 
USING (is_authenticated_user() AND auth.uid() = user_id)
WITH CHECK (is_authenticated_user() AND auth.uid() = user_id);

CREATE POLICY "authenticated_users_can_delete_own_notifications" 
ON public.notification_preferences 
FOR DELETE 
USING (is_authenticated_user() AND auth.uid() = user_id);

-- =====================================================
-- FIX 3: contact_messages - add explicit DENY for public
-- =====================================================

-- Add explicit restrictive policy to ensure no public access even if RLS misconfigured
CREATE POLICY "deny_public_contact_access" 
ON public.contact_messages 
AS RESTRICTIVE
FOR SELECT 
USING (auth.uid() IS NOT NULL);
