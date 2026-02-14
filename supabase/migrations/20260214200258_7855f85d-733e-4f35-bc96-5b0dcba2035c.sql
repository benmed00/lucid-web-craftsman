
-- Fix: Restrict payment_events INSERT to admin users only
-- Service role (used by edge functions like stripe-webhook) bypasses RLS entirely
DROP POLICY IF EXISTS "Service role inserts payment events" ON public.payment_events;

CREATE POLICY "Admins can insert payment events"
ON public.payment_events FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));
