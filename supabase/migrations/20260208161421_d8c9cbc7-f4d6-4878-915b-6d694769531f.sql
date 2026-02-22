
-- ============================================================
-- Payment Events table for full payment lifecycle observability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id),
  correlation_id text,
  event_type text NOT NULL,
  -- Event types: payment_initiated, stripe_session_created, stripe_webhook_received,
  -- payment_confirmed, payment_failed, stock_decremented, email_sent, refund_initiated
  status text NOT NULL DEFAULT 'info',
  -- Status: info, success, warning, error
  actor text NOT NULL DEFAULT 'system',
  -- Actor: client, edge_function, stripe_webhook, system
  details jsonb DEFAULT '{}'::jsonb,
  error_message text,
  ip_address text,
  user_agent text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX idx_payment_events_correlation_id ON public.payment_events(correlation_id);
CREATE INDEX idx_payment_events_event_type ON public.payment_events(event_type);
CREATE INDEX idx_payment_events_created_at ON public.payment_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read payment events
CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Edge functions (service_role) insert events - no client writes
CREATE POLICY "Service role inserts payment events"
  ON public.payment_events FOR INSERT
  WITH CHECK (true);

-- No updates or deletes (immutable audit log)
CREATE POLICY "No updates on payment events"
  ON public.payment_events FOR UPDATE
  USING (false);

CREATE POLICY "No deletes on payment events"
  ON public.payment_events FOR DELETE
  USING (false);
