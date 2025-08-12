-- Secure RLS for shipments: restrict write access to admins only, keep owner read access

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Drop insecure or conflicting policies if they exist
DROP POLICY IF EXISTS insert_shipments ON public.shipments;
DROP POLICY IF EXISTS update_shipments ON public.shipments;
DROP POLICY IF EXISTS "Admins can select all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;

-- Create secure admin policies
CREATE POLICY "Admins can select all shipments"
ON public.shipments
FOR SELECT
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert shipments"
ON public.shipments
FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update shipments"
ON public.shipments
FOR UPDATE
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can delete shipments"
ON public.shipments
FOR DELETE
USING (public.is_admin_user(auth.uid()));

-- Note: We keep the existing owner SELECT policy (select_shipments_by_order_owner)
-- so customers can read shipments for their own orders but cannot modify them.