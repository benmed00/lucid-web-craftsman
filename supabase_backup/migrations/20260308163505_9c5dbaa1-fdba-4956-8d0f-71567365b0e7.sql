
-- Drop the blocking SELECT policy that prevents upsert from working for anon
DROP POLICY IF EXISTS "block_anonymous_newsletter_access" ON public.newsletter_subscriptions;
