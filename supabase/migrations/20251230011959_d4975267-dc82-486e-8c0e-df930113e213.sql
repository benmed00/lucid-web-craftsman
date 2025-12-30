
-- Fix: Tighten authenticated user INSERT to only allow their own email
DROP POLICY IF EXISTS "Authenticated users can subscribe to newsletter" ON public.newsletter_subscriptions;

CREATE POLICY "Authenticated users can subscribe with own email" 
ON public.newsletter_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND user_owns_newsletter_subscription(email)
);

-- Add a comment explaining the security design
COMMENT ON FUNCTION public.user_owns_newsletter_subscription(text) IS 
'Security function: Returns true only if the provided email matches the currently authenticated user''s email. 
Used by RLS policies to ensure users can only access their own newsletter subscription.
Prevents email enumeration as it receives the row''s email value, not user-controlled input.';
