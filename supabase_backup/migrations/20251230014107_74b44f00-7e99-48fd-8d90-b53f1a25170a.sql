-- =====================================================
-- MEDIUM-PRIORITY FOREIGN KEY CONSTRAINTS
-- =====================================================

-- loyalty_points -> profiles (user_id)
ALTER TABLE public.loyalty_points
  ADD CONSTRAINT fk_loyalty_points_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- loyalty_transactions -> profiles (user_id)
ALTER TABLE public.loyalty_transactions
  ADD CONSTRAINT fk_loyalty_transactions_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- loyalty_redemptions -> profiles (user_id)
ALTER TABLE public.loyalty_redemptions
  ADD CONSTRAINT fk_loyalty_redemptions_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- notification_preferences -> profiles (user_id)
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT fk_notification_preferences_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- support_tickets -> profiles (user_id)
ALTER TABLE public.support_tickets
  ADD CONSTRAINT fk_support_tickets_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- support_tickets_error_reports -> profiles (user_id)
ALTER TABLE public.support_tickets_error_reports
  ADD CONSTRAINT fk_error_reports_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- blog_posts -> profiles (author_id)
ALTER TABLE public.blog_posts
  ADD CONSTRAINT fk_blog_posts_author
  FOREIGN KEY (author_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- product_reviews -> profiles (user_id)
ALTER TABLE public.product_reviews
  ADD CONSTRAINT fk_product_reviews_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- cart_items -> profiles (user_id)
ALTER TABLE public.cart_items
  ADD CONSTRAINT fk_cart_items_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- orders -> profiles (user_id)
ALTER TABLE public.orders
  ADD CONSTRAINT fk_orders_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- shipping_addresses -> profiles (user_id)
ALTER TABLE public.shipping_addresses
  ADD CONSTRAINT fk_shipping_addresses_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- wishlist -> profiles (user_id)
ALTER TABLE public.wishlist
  ADD CONSTRAINT fk_wishlist_user
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user_id ON public.loyalty_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON public.support_tickets_error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);