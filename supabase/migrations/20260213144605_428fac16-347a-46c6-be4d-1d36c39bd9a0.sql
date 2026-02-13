
-- FIX: Remove overly permissive guest SELECT policy on checkout_sessions
-- The policy "Guests can read their own sessions" allows reading ALL sessions with any guest_id
-- The proper policy "checkout_sessions_guest_select" already validates guest_id = get_request_guest_id()
DROP POLICY IF EXISTS "Guests can read their own sessions" ON public.checkout_sessions;
