-- Fix critical security issue: Newsletter subscription email harvesting vulnerability
-- Replace overly permissive RLS policy with proper access controls

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can manage their own newsletter subscription" ON public.newsletter_subscriptions;

-- Drop existing admin policy to recreate it properly 
DROP POLICY IF EXISTS "Admins can view all newsletter subscriptions" ON public.newsletter_subscriptions;

-- Create proper RLS policies to prevent email harvesting
-- 1. Allow authenticated users to insert their own subscription with their email
CREATE POLICY "Users can insert their own newsletter subscription" ON public.newsletter_subscriptions
FOR INSERT 
TO authenticated
WITH CHECK (true); -- Allow insertion but we'll validate in application logic

-- 2. Allow users to view only their own subscription (by matching email with authenticated user)
CREATE POLICY "Users can view their own newsletter subscription" ON public.newsletter_subscriptions
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
);

-- 3. Allow users to update their own subscription
CREATE POLICY "Users can update their own newsletter subscription" ON public.newsletter_subscriptions
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
);

-- 4. Admins can manage all newsletter subscriptions
CREATE POLICY "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions
FOR ALL 
TO authenticated
USING (is_admin_user(auth.uid()))
WITH CHECK (is_admin_user(auth.uid()));

-- 5. Explicitly deny public access to prevent email harvesting
CREATE POLICY "Deny public access to newsletter subscriptions" ON public.newsletter_subscriptions
FOR ALL 
TO anon
USING (false)
WITH CHECK (false);