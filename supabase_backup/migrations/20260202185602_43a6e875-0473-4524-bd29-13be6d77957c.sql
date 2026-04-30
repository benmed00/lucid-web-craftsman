-- ============================================================
-- CHECKOUT SESSIONS TABLE
-- Tracks checkout progress even for abandoned sessions
-- ============================================================

-- Create checkout_sessions table
CREATE TABLE public.checkout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Session identification
  guest_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Step tracking
  current_step INTEGER NOT NULL DEFAULT 1,
  last_completed_step INTEGER NOT NULL DEFAULT 0,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'completed', 'abandoned', 'payment_failed')),
  
  -- Form data (stored at each step)
  personal_info JSONB DEFAULT NULL,
  shipping_info JSONB DEFAULT NULL,
  
  -- Promo code tracking (critical requirement)
  promo_code TEXT DEFAULT NULL,
  promo_code_valid BOOLEAN DEFAULT NULL,
  promo_discount_type TEXT DEFAULT NULL,
  promo_discount_value NUMERIC DEFAULT NULL,
  promo_discount_applied NUMERIC DEFAULT NULL,
  promo_free_shipping BOOLEAN DEFAULT false,
  
  -- Cart snapshot
  cart_items JSONB DEFAULT NULL,
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  
  -- Device metadata (GDPR compliant)
  device_type TEXT DEFAULT NULL,
  browser TEXT DEFAULT NULL,
  os TEXT DEFAULT NULL,
  client_ip TEXT DEFAULT NULL,
  client_country TEXT DEFAULT NULL,
  
  -- Linked order (when payment completes)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  abandoned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Add indexes for common queries
CREATE INDEX idx_checkout_sessions_guest_id ON public.checkout_sessions(guest_id);
CREATE INDEX idx_checkout_sessions_user_id ON public.checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_status ON public.checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_created_at ON public.checkout_sessions(created_at DESC);
CREATE INDEX idx_checkout_sessions_order_id ON public.checkout_sessions(order_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_checkout_sessions_updated_at
  BEFORE UPDATE ON public.checkout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Guests can upsert their own sessions (by guest_id)
CREATE POLICY "checkout_sessions_guest_insert"
  ON public.checkout_sessions
  FOR INSERT
  WITH CHECK (guest_id IS NOT NULL);

-- Allow upsert/update for guests by guest_id
CREATE POLICY "checkout_sessions_guest_update"
  ON public.checkout_sessions
  FOR UPDATE
  USING (guest_id IS NOT NULL)
  WITH CHECK (guest_id IS NOT NULL);

-- Authenticated users can manage their own sessions
CREATE POLICY "checkout_sessions_user_select"
  ON public.checkout_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin_user(auth.uid()));

CREATE POLICY "checkout_sessions_user_insert"
  ON public.checkout_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR guest_id IS NOT NULL);

CREATE POLICY "checkout_sessions_user_update"
  ON public.checkout_sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all sessions
CREATE POLICY "checkout_sessions_admin_select"
  ON public.checkout_sessions
  FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Admins can update sessions (for marking as abandoned, etc.)
CREATE POLICY "checkout_sessions_admin_update"
  ON public.checkout_sessions
  FOR UPDATE
  USING (is_admin_user(auth.uid()));

-- Block anonymous access
CREATE POLICY "checkout_sessions_block_anon"
  ON public.checkout_sessions
  FOR ALL
  USING (false);

-- ============================================================
-- FUNCTION: Mark expired sessions as abandoned
-- ============================================================
CREATE OR REPLACE FUNCTION mark_abandoned_checkout_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.checkout_sessions
  SET 
    status = 'abandoned',
    abandoned_at = now(),
    updated_at = now()
  WHERE 
    status = 'in_progress'
    AND expires_at < now()
    AND order_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ADD checkout_session_id to orders table
-- ============================================================
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS checkout_session_id UUID REFERENCES public.checkout_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_checkout_session_id ON public.orders(checkout_session_id);