
-- Create a PERMISSIVE update policy for upsert (ON CONFLICT DO UPDATE)
CREATE POLICY "newsletter_update_permissive"
ON public.newsletter_subscriptions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);
