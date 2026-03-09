
-- Back-in-stock notification subscriptions
CREATE TABLE public.back_in_stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id integer NOT NULL,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  notified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_email UNIQUE (product_id, email)
);

-- Enable RLS
ALTER TABLE public.back_in_stock_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (with valid email)
CREATE POLICY "bisn_insert" ON public.back_in_stock_notifications
  FOR INSERT WITH CHECK (
    email IS NOT NULL AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- Users can view their own subscriptions
CREATE POLICY "bisn_select" ON public.back_in_stock_notifications
  FOR SELECT USING (
    email = get_auth_user_email()
    OR is_admin_user((SELECT auth.uid()))
  );

-- Users can delete their own subscriptions
CREATE POLICY "bisn_delete" ON public.back_in_stock_notifications
  FOR DELETE USING (
    email = get_auth_user_email()
    OR is_admin_user((SELECT auth.uid()))
  );

-- Admins can update (to mark as notified)
CREATE POLICY "bisn_update" ON public.back_in_stock_notifications
  FOR UPDATE USING (
    is_admin_user((SELECT auth.uid()))
  );

-- Index for efficient lookups
CREATE INDEX idx_bisn_product_status ON public.back_in_stock_notifications(product_id, status);
CREATE INDEX idx_bisn_email ON public.back_in_stock_notifications(email);
