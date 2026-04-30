-- ====================================
-- FIX: Update Products Table RLS Policies
-- ====================================
-- Replace direct admin_users checks with is_admin_user() security definer function

-- Drop old policies that directly query admin_users table
DROP POLICY IF EXISTS "Only admin users can delete products" ON public.products;
DROP POLICY IF EXISTS "Only admin users can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admin users can update products" ON public.products;

-- Create new secure policies using is_admin_user() function
CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- Log the security fix
INSERT INTO public.audit_logs (
  user_id, action, resource_type, resource_id, new_values
) VALUES (
  auth.uid(),
  'SECURITY_POLICY_FIX',
  'products',
  'rls_policies_updated',
  jsonb_build_object(
    'migration', 'update_products_table_policies',
    'timestamp', NOW(),
    'description', 'Updated products table policies to use is_admin_user() security definer function',
    'policies_updated', ARRAY['delete', 'insert', 'update'],
    'security_improvement', 'Prevents privilege escalation via admin_users table compromise'
  )
);