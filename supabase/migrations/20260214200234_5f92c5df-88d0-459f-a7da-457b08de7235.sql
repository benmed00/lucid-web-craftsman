
-- Fix: Restrict fraud_assessments INSERT to admin users only
-- Service role (used by edge functions) bypasses RLS, so this won't break system operations
DROP POLICY IF EXISTS "System can insert fraud assessments" ON public.fraud_assessments;

CREATE POLICY "Admins can insert fraud assessments"
ON public.fraud_assessments FOR INSERT
WITH CHECK (is_admin_user(auth.uid()));
