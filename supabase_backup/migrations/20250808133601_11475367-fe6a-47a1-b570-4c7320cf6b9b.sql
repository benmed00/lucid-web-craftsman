-- Clean up orphaned admin user and fix RLS policies
DELETE FROM public.admin_users WHERE user_id IS NULL;

-- Make user_id NOT NULL to prevent future orphaned records
ALTER TABLE public.admin_users ALTER COLUMN user_id SET NOT NULL;

-- Drop existing permissive policies for products
DROP POLICY IF EXISTS "Only authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Only authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Only authenticated users can delete products" ON public.products;

-- Create admin-only policies for products
CREATE POLICY "Only admin users can insert products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only admin users can update products" ON public.products
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Only admin users can delete products" ON public.products
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Add security definer function for admin role checking
CREATE OR REPLACE FUNCTION public.is_admin_user(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_uuid
  );
$$;