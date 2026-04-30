-- Complete database structure (Part 4: Triggers, Indexes and Sample Data)

-- =============================================================================
-- 5. ADD TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================================================

-- Add triggers for all tables with updated_at columns
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at
  BEFORE UPDATE ON public.newsletter_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_addresses_updated_at
  BEFORE UPDATE ON public.shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_coupons_updated_at
  BEFORE UPDATE ON public.discount_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 6. CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- Product categories indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_product ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON public.product_categories(category_id);

-- Enhanced products indexes
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_rating ON public.products(rating_average);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.product_reviews(is_approved);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.product_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.product_analytics(created_at);

-- Blog indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

-- Wishlists indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);

-- Newsletter indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON public.newsletter_subscriptions(status);

-- Shipping addresses indexes
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_default ON public.shipping_addresses(is_default);

-- =============================================================================
-- 7. INSERT SAMPLE DATA FOR CATEGORIES
-- =============================================================================

-- Insert main categories for Rif artisan products
INSERT INTO public.categories (name, slug, description, sort_order, is_active) VALUES
('Chapeaux', 'chapeaux', 'Chapeaux traditionnels du Rif tissés à la main', 1, true),
('Sacs', 'sacs', 'Sacs artisanaux en fibres naturelles', 2, true),
('Paniers', 'paniers', 'Paniers tressés pour la maison et le marché', 3, true),
('Accessoires', 'accessoires', 'Bijoux et accessoires berbères authentiques', 4, true),
('Décoration', 'decoration', 'Objets décoratifs pour la maison', 5, true),
('Vêtements', 'vetements', 'Vêtements traditionnels du Rif', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for chapeaux
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active) 
SELECT 
  'Chapeaux de Paille', 'chapeaux-paille', 'Chapeaux de paille traditionnels', 
  c.id, 1, true
FROM public.categories c WHERE c.slug = 'chapeaux'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active) 
SELECT 
  'Chapeaux Berbères', 'chapeaux-berberes', 'Chapeaux traditionnels berbères', 
  c.id, 2, true
FROM public.categories c WHERE c.slug = 'chapeaux'
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories for sacs
INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active) 
SELECT 
  'Sacs à Main', 'sacs-main', 'Sacs à main artisanaux', 
  c.id, 1, true
FROM public.categories c WHERE c.slug = 'sacs'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (name, slug, description, parent_id, sort_order, is_active) 
SELECT 
  'Sacs de Voyage', 'sacs-voyage', 'Grands sacs pour les voyages', 
  c.id, 2, true
FROM public.categories c WHERE c.slug = 'sacs'
ON CONFLICT (slug) DO NOTHING;