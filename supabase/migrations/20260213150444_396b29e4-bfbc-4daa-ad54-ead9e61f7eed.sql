-- Clean up redundant/overlapping checkout_sessions policies
-- Keep the more specific and secure policies, drop the looser ones

-- Drop the loose "Authenticated users can create" (superseded by checkout_sessions_user_insert which also handles guests)
DROP POLICY IF EXISTS "Authenticated users can create their checkout session" ON public.checkout_sessions;

-- Drop the loose "Guests can create checkout session" (superseded by checkout_sessions_guest_insert which validates guest_id)
DROP POLICY IF EXISTS "Guests can create checkout session" ON public.checkout_sessions;

-- Drop the loose "Users can read their own checkout sessions" (superseded by checkout_sessions_user_select)
DROP POLICY IF EXISTS "Users can read their own checkout sessions" ON public.checkout_sessions;

-- Verify remaining policies cover all cases:
-- INSERT: checkout_sessions_guest_insert (guest_id validated), checkout_sessions_user_insert (auth.uid() or guest)
-- SELECT: checkout_sessions_guest_select (guest_id validated + expiry), checkout_sessions_user_select (auth.uid() or admin), checkout_sessions_admin_select
-- UPDATE: checkout_sessions_guest_update (guest_id validated + expiry), checkout_sessions_user_update (auth.uid()), checkout_sessions_admin_update