
-- A/B test configuration for UI themes
CREATE TABLE public.ab_theme_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'theme-test',
  is_active BOOLEAN NOT NULL DEFAULT false,
  variant_a TEXT NOT NULL DEFAULT 'modern',
  variant_b TEXT NOT NULL DEFAULT 'legacy',
  split_percentage INTEGER NOT NULL DEFAULT 50,
  variant_a_views INTEGER NOT NULL DEFAULT 0,
  variant_b_views INTEGER NOT NULL DEFAULT 0,
  variant_a_add_to_cart INTEGER NOT NULL DEFAULT 0,
  variant_b_add_to_cart INTEGER NOT NULL DEFAULT 0,
  variant_a_checkout INTEGER NOT NULL DEFAULT 0,
  variant_b_checkout INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ab_theme_tests ENABLE ROW LEVEL SECURITY;

-- Everyone can read (frontend needs to know which test is active)
CREATE POLICY "Anyone can read active AB tests"
ON public.ab_theme_tests
FOR SELECT
USING (true);

-- Only admins can modify (via service role or admin check)
CREATE POLICY "Admins can manage AB tests"
ON public.ab_theme_tests
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
  )
);

-- Insert default row
INSERT INTO public.ab_theme_tests (name, is_active, variant_a, variant_b, split_percentage)
VALUES ('default-theme-test', false, 'modern', 'legacy', 50);

-- RPC to atomically increment counters (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_ab_counter(
  test_id UUID,
  variant TEXT,
  counter_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF variant = 'a' THEN
    IF counter_type = 'view' THEN
      UPDATE ab_theme_tests SET variant_a_views = variant_a_views + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'add_to_cart' THEN
      UPDATE ab_theme_tests SET variant_a_add_to_cart = variant_a_add_to_cart + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'checkout' THEN
      UPDATE ab_theme_tests SET variant_a_checkout = variant_a_checkout + 1, updated_at = now() WHERE id = test_id;
    END IF;
  ELSIF variant = 'b' THEN
    IF counter_type = 'view' THEN
      UPDATE ab_theme_tests SET variant_b_views = variant_b_views + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'add_to_cart' THEN
      UPDATE ab_theme_tests SET variant_b_add_to_cart = variant_b_add_to_cart + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'checkout' THEN
      UPDATE ab_theme_tests SET variant_b_checkout = variant_b_checkout + 1, updated_at = now() WHERE id = test_id;
    END IF;
  END IF;
END;
$$;
