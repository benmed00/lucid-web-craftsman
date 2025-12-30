-- =====================================================
-- CRITICAL DATABASE RELATIONSHIP FIXES
-- =====================================================

-- 1. DROP DUPLICATE WISHLISTS TABLE (empty, duplicate of wishlist)
DROP TABLE IF EXISTS public.wishlists;

-- 2. FIX email_logs.order_id TYPE (TEXT -> UUID)
-- First, clear any invalid data and alter the column type
ALTER TABLE public.email_logs 
  ALTER COLUMN order_id TYPE uuid USING NULLIF(order_id, '')::uuid;

-- 3. ADD FOREIGN KEY CONSTRAINTS FOR CRITICAL TABLES

-- cart_items -> products (product_id)
ALTER TABLE public.cart_items
  ADD CONSTRAINT fk_cart_items_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- order_items -> orders (order_id)
ALTER TABLE public.order_items
  ADD CONSTRAINT fk_order_items_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE CASCADE;

-- order_items -> products (product_id)
ALTER TABLE public.order_items
  ADD CONSTRAINT fk_order_items_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE SET NULL;

-- payments -> orders (order_id)
ALTER TABLE public.payments
  ADD CONSTRAINT fk_payments_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE CASCADE;

-- shipments -> orders (order_id)
ALTER TABLE public.shipments
  ADD CONSTRAINT fk_shipments_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE CASCADE;

-- email_logs -> orders (order_id) - now that it's UUID type
ALTER TABLE public.email_logs
  ADD CONSTRAINT fk_email_logs_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE SET NULL;

-- product_reviews -> products (product_id)
ALTER TABLE public.product_reviews
  ADD CONSTRAINT fk_product_reviews_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- product_categories -> products (product_id)
ALTER TABLE public.product_categories
  ADD CONSTRAINT fk_product_categories_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- product_categories -> categories (category_id)
ALTER TABLE public.product_categories
  ADD CONSTRAINT fk_product_categories_category
  FOREIGN KEY (category_id) REFERENCES public.categories(id)
  ON DELETE CASCADE;

-- wishlist -> products (product_id)
ALTER TABLE public.wishlist
  ADD CONSTRAINT fk_wishlist_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- product_analytics -> products (product_id)
ALTER TABLE public.product_analytics
  ADD CONSTRAINT fk_product_analytics_product
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE CASCADE;

-- loyalty_redemptions -> loyalty_rewards (reward_id)
ALTER TABLE public.loyalty_redemptions
  ADD CONSTRAINT fk_loyalty_redemptions_reward
  FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id)
  ON DELETE CASCADE;

-- loyalty_redemptions -> orders (order_id)
ALTER TABLE public.loyalty_redemptions
  ADD CONSTRAINT fk_loyalty_redemptions_order
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
  ON DELETE SET NULL;

-- categories self-reference (parent_id)
ALTER TABLE public.categories
  ADD CONSTRAINT fk_categories_parent
  FOREIGN KEY (parent_id) REFERENCES public.categories(id)
  ON DELETE SET NULL;

-- Create indexes for foreign key columns to improve join performance
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_reward_id ON public.loyalty_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_order_id ON public.loyalty_redemptions(order_id);