-- Grant INSERT permission to anon role for newsletter subscriptions
GRANT INSERT ON public.newsletter_subscriptions TO anon;
GRANT INSERT ON public.newsletter_subscriptions TO authenticated;