-- Complete database structure (Part 3: Security and RLS Policies)

-- =============================================================================
-- 3. ENABLE ROW LEVEL SECURITY ON ALL NEW TABLES
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 4. CREATE RLS POLICIES
-- =============================================================================

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are publicly readable"
  ON public.categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (is_admin_user(auth.uid()));

-- Product categories policies
CREATE POLICY "Product categories are publicly readable"
  ON public.product_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage product categories"
  ON public.product_categories FOR ALL
  USING (is_admin_user(auth.uid()));

-- Order items policies
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (true); -- Will be controlled by application logic

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payments.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage payments"
  ON public.payments FOR ALL
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can manage payments"
  ON public.payments FOR ALL
  WITH CHECK (true); -- For webhook processing

-- Newsletter subscriptions policies
CREATE POLICY "Users can manage their own newsletter subscription"
  ON public.newsletter_subscriptions FOR ALL
  USING (true); -- Anyone can subscribe/unsubscribe

CREATE POLICY "Admins can view all newsletter subscriptions"
  ON public.newsletter_subscriptions FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Shipping addresses policies
CREATE POLICY "Users can manage their own shipping addresses"
  ON public.shipping_addresses FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all shipping addresses"
  ON public.shipping_addresses FOR SELECT
  USING (is_admin_user(auth.uid()));

-- Product reviews policies
CREATE POLICY "Published reviews are publicly readable"
  ON public.product_reviews FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view their own reviews"
  ON public.product_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.product_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.product_reviews FOR ALL
  USING (is_admin_user(auth.uid()));

-- Discount coupons policies
CREATE POLICY "Active coupons are publicly readable"
  ON public.discount_coupons FOR SELECT
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

CREATE POLICY "Admins can manage discount coupons"
  ON public.discount_coupons FOR ALL
  USING (is_admin_user(auth.uid()));

-- Wishlists policies
CREATE POLICY "Users can manage their own wishlist"
  ON public.wishlists FOR ALL
  USING (auth.uid() = user_id);

-- Blog posts policies
CREATE POLICY "Published blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

CREATE POLICY "Authors can manage their own blog posts"
  ON public.blog_posts FOR ALL
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all blog posts"
  ON public.blog_posts FOR ALL
  USING (is_admin_user(auth.uid()));

-- Support tickets policies
CREATE POLICY "Users can view their own support tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own support tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support tickets"
  ON public.support_tickets FOR ALL
  USING (is_admin_user(auth.uid()));

-- Support ticket messages policies
CREATE POLICY "Users can view messages from their tickets"
  ON public.support_ticket_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND (support_tickets.user_id = auth.uid() OR is_admin_user(auth.uid()))
  ));

CREATE POLICY "Users can create messages for their tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets 
    WHERE support_tickets.id = support_ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  ) OR is_admin_user(auth.uid()));

CREATE POLICY "Admins can manage all ticket messages"
  ON public.support_ticket_messages FOR ALL
  USING (is_admin_user(auth.uid()));

-- Product analytics policies (admin only for privacy)
CREATE POLICY "Admins can view product analytics"
  ON public.product_analytics FOR SELECT
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System can insert analytics"
  ON public.product_analytics FOR INSERT
  WITH CHECK (true);