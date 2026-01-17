-- =====================================================
-- FIX 1: contact_messages - add admin-only SELECT policy
-- =====================================================

-- Drop any existing select policies that might be too permissive
DROP POLICY IF EXISTS "contact_messages_select" ON public.contact_messages;

-- Create strict admin-only SELECT policy
CREATE POLICY "admin_only_contact_messages_select"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- FIX 2: shipping_addresses - strengthen user_id validation
-- =====================================================

-- Drop existing potentially weak policies
DROP POLICY IF EXISTS "shipping_addresses_select" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Users can view their own shipping addresses" ON public.shipping_addresses;

-- Create strict user-only or admin SELECT policy
CREATE POLICY "shipping_addresses_select_strict"
ON public.shipping_addresses
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
);

-- =====================================================
-- FIX 3: profiles - verify strict user-only access
-- =====================================================

-- Ensure profiles_select_strict exists with proper validation
DROP POLICY IF EXISTS "profiles_select_strict" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Create strict user-only or admin SELECT policy
CREATE POLICY "profiles_select_strict"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'super_admin')
);

-- =====================================================
-- FIX 4: newsletter_subscriptions - use auth.uid() instead of JWT email
-- =====================================================

DROP POLICY IF EXISTS "newsletter_select_strict" ON public.newsletter_subscriptions;

-- Create function to get user email from auth.users safely
CREATE OR REPLACE FUNCTION public.get_auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Create policy using the secure function
CREATE POLICY "newsletter_select_strict_v2"
ON public.newsletter_subscriptions
FOR SELECT
TO authenticated
USING (
    email = public.get_auth_user_email()
    OR public.has_role(auth.uid(), 'super_admin')
);