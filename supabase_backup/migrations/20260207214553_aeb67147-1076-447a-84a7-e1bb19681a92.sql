-- Fix: payments_insert allows ANY anonymous user to INSERT into payments table
-- Only the service_role (Edge Functions) should insert payment records
DROP POLICY IF EXISTS "payments_insert" ON public.payments;

-- No public INSERT policy needed - payments are created exclusively by Edge Functions using service_role
-- This removes the security hole where any client could insert fake payment records

-- Also fix payments_update - users should NOT be able to update payment records directly
DROP POLICY IF EXISTS "payments_update" ON public.payments;

-- Only super admins can update payments (for refund processing etc.)
CREATE POLICY "Only admins can update payments"
ON public.payments
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));