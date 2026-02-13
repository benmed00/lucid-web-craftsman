-- Grant table-level permissions so RLS policies can be evaluated
GRANT SELECT, INSERT, UPDATE ON public.checkout_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.checkout_sessions TO authenticated;