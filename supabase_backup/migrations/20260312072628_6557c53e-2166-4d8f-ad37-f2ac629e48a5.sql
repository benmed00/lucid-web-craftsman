CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_id_unique 
ON public.orders (stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;