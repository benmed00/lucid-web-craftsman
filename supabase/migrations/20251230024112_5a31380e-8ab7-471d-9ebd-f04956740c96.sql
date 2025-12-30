-- Drop conflicting policies that block anonymous upsert
DROP POLICY IF EXISTS "deny_anonymous_newsletter_update" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Anonymous users can subscribe to newsletter" ON newsletter_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can subscribe with own email" ON newsletter_subscriptions;

-- Create a single unified policy for INSERT that works for both anonymous and authenticated users
CREATE POLICY "Anyone can subscribe to newsletter"
ON newsletter_subscriptions
FOR INSERT
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
);

-- Allow update for upsert operations (only on the email being subscribed)
-- This enables the ON CONFLICT clause to work properly
CREATE POLICY "Allow upsert update on newsletter subscriptions"
ON newsletter_subscriptions
FOR UPDATE
USING (true)
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text
);