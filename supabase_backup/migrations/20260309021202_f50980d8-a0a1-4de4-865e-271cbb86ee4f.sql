-- Fix overly permissive newsletter RLS policy: scope to owner or admin
DROP POLICY IF EXISTS "newsletter_update_permissive" ON public.newsletter_subscriptions;