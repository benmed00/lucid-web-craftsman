-- Drop the existing policy that uses rate limiting which causes issues
DROP POLICY IF EXISTS "newsletter_insert_policy" ON public.newsletter_subscriptions;

-- Create a simpler insert policy that allows public inserts with email validation
CREATE POLICY "newsletter_insert_policy" 
ON public.newsletter_subscriptions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);