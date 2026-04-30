
-- ============================================================================
-- 1. FIX: checkout_sessions_user_insert allows arbitrary guest_id
-- The current policy allows (user_id = auth.uid()) OR (guest_id IS NOT NULL)
-- which means any authenticated user can insert with ANY guest_id.
-- Fix: require guest_id to match the request header when using guest path.
-- ============================================================================

DROP POLICY IF EXISTS "checkout_sessions_user_insert" ON public.checkout_sessions;

CREATE POLICY "checkout_sessions_user_insert"
ON public.checkout_sessions
FOR INSERT
WITH CHECK (
  (user_id = auth.uid())
  OR
  (guest_id IS NOT NULL AND guest_id = get_request_guest_id())
);

-- ============================================================================
-- 2. FIX: user_preferences admin access - restrict SELECT to owner only
-- Admins don't need to view user preferences (language, timezone, privacy).
-- Remove admin override from SELECT policy.
-- ============================================================================

DROP POLICY IF EXISTS "user_preferences_select_policy" ON public.user_preferences;

CREATE POLICY "user_preferences_select_policy"
ON public.user_preferences
FOR SELECT
USING (user_id = (SELECT auth.uid()));
