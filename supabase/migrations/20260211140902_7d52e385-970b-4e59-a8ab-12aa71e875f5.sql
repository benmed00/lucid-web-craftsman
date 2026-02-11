-- Fix: Grant base privileges on checkout_sessions to anon and authenticated roles
-- RLS policies exist but the base GRANT was never issued, causing 401 on INSERT

GRANT SELECT, INSERT, UPDATE ON public.checkout_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.checkout_sessions TO authenticated;
