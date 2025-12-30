-- =============================================
-- PERFORMANCE OPTIMIZATION PART 2: More RLS Init Plan Fixes
-- =============================================

-- loyalty_points table - consolidate multiple policies into single optimized ones
DROP POLICY IF EXISTS "Admins can manage all loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON public.loyalty_points;

CREATE POLICY "Admins can manage all loyalty points" ON public.loyalty_points
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points
FOR SELECT USING ((select auth.uid()) = user_id);

-- loyalty_redemptions table
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.loyalty_redemptions;

CREATE POLICY "Admins can manage all redemptions" ON public.loyalty_redemptions
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view their own redemptions" ON public.loyalty_redemptions
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own redemptions" ON public.loyalty_redemptions
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- loyalty_transactions table
DROP POLICY IF EXISTS "Admins can manage all loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Users can view their own loyalty transactions" ON public.loyalty_transactions;

CREATE POLICY "Admins can manage all loyalty transactions" ON public.loyalty_transactions
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view their own loyalty transactions" ON public.loyalty_transactions
FOR SELECT USING ((select auth.uid()) = user_id);

-- loyalty_rewards table
DROP POLICY IF EXISTS "Admins can manage loyalty rewards" ON public.loyalty_rewards;

CREATE POLICY "Admins can manage loyalty rewards" ON public.loyalty_rewards
FOR ALL USING (is_admin_user((select auth.uid())));

-- shipments table
DROP POLICY IF EXISTS "Admins can select all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
DROP POLICY IF EXISTS "select_shipments_by_order_owner" ON public.shipments;

CREATE POLICY "Admins can manage shipments" ON public.shipments
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view own shipments" ON public.shipments
FOR SELECT USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = shipments.order_id AND o.user_id = (select auth.uid())
));

-- shipping_zones table
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
FOR ALL USING (is_admin_user((select auth.uid())));

-- support_tickets table
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert tickets" ON public.support_tickets
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own tickets" ON public.support_tickets
FOR UPDATE USING ((select auth.uid()) = user_id);

-- support_ticket_messages table
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.support_ticket_messages;

CREATE POLICY "Admins can manage all ticket messages" ON public.support_ticket_messages
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view messages from their tickets" ON public.support_ticket_messages
FOR SELECT USING (can_access_support_ticket(ticket_id));

CREATE POLICY "Users can create messages for their tickets" ON public.support_ticket_messages
FOR INSERT WITH CHECK (can_access_support_ticket(ticket_id));

-- cart_items table
DROP POLICY IF EXISTS "Users can view their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON public.cart_items;

CREATE POLICY "Users can view their own cart items" ON public.cart_items
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own cart items" ON public.cart_items
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own cart items" ON public.cart_items
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own cart items" ON public.cart_items
FOR DELETE USING ((select auth.uid()) = user_id);

-- wishlist table
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.wishlist;

CREATE POLICY "Users can view their own wishlist" ON public.wishlist
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add to their own wishlist" ON public.wishlist
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlist
FOR DELETE USING ((select auth.uid()) = user_id);

-- orders table - users own orders
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

CREATE POLICY "select_own_orders" ON public.orders
FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own orders" ON public.orders
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
FOR UPDATE USING ((select auth.uid()) = user_id);

-- order_items table
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can view their own order items" ON public.order_items
FOR SELECT USING (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = order_items.order_id AND orders.user_id = (select auth.uid())
));

-- blog_posts table
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can manage their own blog posts" ON public.blog_posts;

CREATE POLICY "Admins can manage all blog posts" ON public.blog_posts
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Authors can manage their own blog posts" ON public.blog_posts
FOR ALL USING ((select auth.uid()) = author_id);

-- product_reviews table
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.product_reviews;

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews
FOR ALL USING (is_admin_user((select auth.uid())));

CREATE POLICY "Users can create reviews" ON public.product_reviews
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reviews" ON public.product_reviews
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own reviews" ON public.product_reviews
FOR SELECT USING ((select auth.uid()) = user_id);

-- audit_logs table
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (is_admin_user((select auth.uid())));

-- product_analytics table
DROP POLICY IF EXISTS "Admins can view product analytics" ON public.product_analytics;

CREATE POLICY "Admins can view product analytics" ON public.product_analytics
FOR SELECT USING (is_admin_user((select auth.uid())));

-- product_categories table
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;

CREATE POLICY "Admins can manage product categories" ON public.product_categories
FOR ALL USING (is_admin_user((select auth.uid())));

-- categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL USING (is_admin_user((select auth.uid())));

-- hero_images table
DROP POLICY IF EXISTS "Admins can manage hero images" ON public.hero_images;

CREATE POLICY "Admins can manage hero images" ON public.hero_images
FOR ALL USING (is_admin_user((select auth.uid())));

-- discount_coupons table
DROP POLICY IF EXISTS "Admins can manage discount coupons" ON public.discount_coupons;

CREATE POLICY "Admins can manage discount coupons" ON public.discount_coupons
FOR ALL USING (is_admin_user((select auth.uid())));

-- newsletter_subscriptions - admin management
DROP POLICY IF EXISTS "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions
FOR ALL USING (is_admin_user((select auth.uid())))
WITH CHECK (is_admin_user((select auth.uid())));