-- Fix RLS policies for newsletter subscriptions first
DROP POLICY IF EXISTS "Users can view their own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update their own newsletter subscription" ON public.newsletter_subscriptions;

-- Create proper RLS policies for newsletter subscriptions
CREATE POLICY "Admins can view all newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view newsletter by email" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
);

CREATE POLICY "Users can update newsletter by email" 
ON public.newsletter_subscriptions 
FOR UPDATE 
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