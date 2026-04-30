-- Optimize RLS policies for better performance by using (select auth.uid()) instead of auth.uid()
-- This prevents the auth function from being re-evaluated for each row

-- Drop existing policies and recreate them with optimized expressions

-- Cart Items policies
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

-- Orders policies
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can select all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;

CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can select all orders" ON public.orders
  FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE USING (is_admin_user((select auth.uid())));

CREATE POLICY "select_own_orders" ON public.orders
  FOR SELECT USING (user_id = (select auth.uid()));

-- Shipments policies
DROP POLICY IF EXISTS "Admins can select all shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can insert shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;
DROP POLICY IF EXISTS "select_shipments_by_order_owner" ON public.shipments;

CREATE POLICY "Admins can select all shipments" ON public.shipments
  FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can insert shipments" ON public.shipments
  FOR INSERT WITH CHECK (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update shipments" ON public.shipments
  FOR UPDATE USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can delete shipments" ON public.shipments
  FOR DELETE USING (is_admin_user((select auth.uid())));

CREATE POLICY "select_shipments_by_order_owner" ON public.shipments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = shipments.order_id AND o.user_id = (select auth.uid())
  ));

-- Shipping Addresses policies
DROP POLICY IF EXISTS "Users can manage their own shipping addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON public.shipping_addresses;

CREATE POLICY "Users can manage their own shipping addresses" ON public.shipping_addresses
  FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all shipping addresses" ON public.shipping_addresses
  FOR SELECT USING (is_admin_user((select auth.uid())));

-- Product Reviews policies
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;

CREATE POLICY "Users can view their own reviews" ON public.product_reviews
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create reviews" ON public.product_reviews
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reviews" ON public.product_reviews
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Products policies
DROP POLICY IF EXISTS "Only admin users can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admin users can update products" ON public.products;
DROP POLICY IF EXISTS "Only admin users can delete products" ON public.products;

CREATE POLICY "Only admin users can insert products" ON public.products
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
  ));

CREATE POLICY "Only admin users can update products" ON public.products
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
  ));

CREATE POLICY "Only admin users can delete products" ON public.products
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid())
  ));

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Audit Logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (is_admin_user((select auth.uid())));

-- User Preferences policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING ((select auth.uid()) IN (
    SELECT profiles.id FROM profiles
    WHERE profiles.id = user_preferences.user_id
  ));

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) IN (
    SELECT profiles.id FROM profiles
    WHERE profiles.id = user_preferences.user_id
  ));

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING ((select auth.uid()) IN (
    SELECT profiles.id FROM profiles
    WHERE profiles.id = user_preferences.user_id
  ));

-- Admin Users policies
DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;

CREATE POLICY "Users can view their own admin status" ON public.admin_users
  FOR SELECT USING ((select auth.uid()) = user_id);

-- Hero Images policies
DROP POLICY IF EXISTS "Admins can manage hero images" ON public.hero_images;

CREATE POLICY "Admins can manage hero images" ON public.hero_images
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Categories policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Product Categories policies
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;

CREATE POLICY "Admins can manage product categories" ON public.product_categories
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Order Items policies
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id AND orders.user_id = (select auth.uid())
  ));

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (is_admin_user((select auth.uid())));

-- Discount Coupons policies
DROP POLICY IF EXISTS "Admins can manage discount coupons" ON public.discount_coupons;

CREATE POLICY "Admins can manage discount coupons" ON public.discount_coupons
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Wishlists policies
DROP POLICY IF EXISTS "Users can manage their own wishlist" ON public.wishlists;

CREATE POLICY "Users can manage their own wishlist" ON public.wishlists
  FOR ALL USING ((select auth.uid()) = user_id);

-- Blog Posts policies
DROP POLICY IF EXISTS "Authors can manage their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;

CREATE POLICY "Authors can manage their own blog posts" ON public.blog_posts
  FOR ALL USING ((select auth.uid()) = author_id);

CREATE POLICY "Admins can manage all blog posts" ON public.blog_posts
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Support Ticket Messages policies
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.support_ticket_messages;

CREATE POLICY "Users can view messages from their tickets" ON public.support_ticket_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM support_tickets
    WHERE support_tickets.id = support_ticket_messages.ticket_id
    AND (support_tickets.user_id = (select auth.uid()) OR is_admin_user((select auth.uid())))
  ));

CREATE POLICY "Users can create messages for their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_ticket_messages.ticket_id
      AND support_tickets.user_id = (select auth.uid())
    ) OR is_admin_user((select auth.uid()))
  );

CREATE POLICY "Admins can manage all ticket messages" ON public.support_ticket_messages
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Product Analytics policies
DROP POLICY IF EXISTS "Admins can view product analytics" ON public.product_analytics;

CREATE POLICY "Admins can view product analytics" ON public.product_analytics
  FOR SELECT USING (is_admin_user((select auth.uid())));

-- Additional policies that might have the same issue
-- Wishlist table policies
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can add to their own wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Users can remove from their own wishlist" ON public.wishlist;

CREATE POLICY "Users can view their own wishlist" ON public.wishlist
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add to their own wishlist" ON public.wishlist
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove from their own wishlist" ON public.wishlist
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Loyalty Points policies
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can insert their own loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can update their own loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Admins can manage all loyalty points" ON public.loyalty_points;

CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own loyalty points" ON public.loyalty_points
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own loyalty points" ON public.loyalty_points
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all loyalty points" ON public.loyalty_points
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Loyalty Transactions policies
DROP POLICY IF EXISTS "Users can view their own loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Admins can manage all loyalty transactions" ON public.loyalty_transactions;

CREATE POLICY "Users can view their own loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all loyalty transactions" ON public.loyalty_transactions
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Loyalty Redemptions policies
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can update their own redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.loyalty_redemptions;

CREATE POLICY "Users can view their own redemptions" ON public.loyalty_redemptions
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own redemptions" ON public.loyalty_redemptions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own redemptions" ON public.loyalty_redemptions
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all redemptions" ON public.loyalty_redemptions
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Loyalty Rewards policies
DROP POLICY IF EXISTS "Admins can manage loyalty rewards" ON public.loyalty_rewards;

CREATE POLICY "Admins can manage loyalty rewards" ON public.loyalty_rewards
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Support Tickets policies
DROP POLICY IF EXISTS "Users can view only their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update only their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all support tickets" ON public.support_tickets;

CREATE POLICY "Users can view only their own support tickets" ON public.support_tickets
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update only their own support tickets" ON public.support_tickets
  FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all support tickets" ON public.support_tickets
  FOR ALL USING (is_admin_user((select auth.uid()))) WITH CHECK (is_admin_user((select auth.uid())));

-- Newsletter Subscriptions policies
DROP POLICY IF EXISTS "Users can view their own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update their own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Users can view their own newsletter subscription" ON public.newsletter_subscriptions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = (select auth.uid()) AND users.email::text = newsletter_subscriptions.email
  ));

CREATE POLICY "Users can update their own newsletter subscription" ON public.newsletter_subscriptions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = (select auth.uid()) AND users.email::text = newsletter_subscriptions.email
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users
    WHERE users.id = (select auth.uid()) AND users.email::text = newsletter_subscriptions.email
  ));

CREATE POLICY "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions
  FOR ALL USING (is_admin_user((select auth.uid()))) WITH CHECK (is_admin_user((select auth.uid())));

-- Security Config policies
DROP POLICY IF EXISTS "Super admins can manage security config" ON public.security_config;

CREATE POLICY "Super admins can manage security config" ON public.security_config
  FOR ALL USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()) AND admin_users.role = 'super-admin'::text
  ));

-- Security Events policies
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;

CREATE POLICY "Admins can view security events" ON public.security_events
  FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update security events" ON public.security_events
  FOR UPDATE USING (is_admin_user((select auth.uid()))) WITH CHECK (is_admin_user((select auth.uid())));

-- Payments policies (Super Admin policies)
DROP POLICY IF EXISTS "Super admins can view all payments" ON public.payments;

CREATE POLICY "Super admins can view all payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.user_id = (select auth.uid()) AND admin_users.role = 'super-admin'::text
  ));

-- Update the user payment view policy as well
DROP POLICY IF EXISTS "Users can view only their own payments with audit" ON public.payments;

CREATE POLICY "Users can view only their own payments with audit" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = payments.order_id AND o.user_id = (select auth.uid())
  ));

-- Shipping Zones policies
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones
  FOR ALL USING (is_admin_user((select auth.uid())));

-- Super Admin policies for admin_users table
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;

CREATE POLICY "Super admins can insert admin users" ON public.admin_users
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users admin_users_1
    WHERE admin_users_1.user_id = (select auth.uid()) AND admin_users_1.role = 'super-admin'::text
  ));

CREATE POLICY "Super admins can update admin users" ON public.admin_users
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM admin_users admin_users_1
    WHERE admin_users_1.user_id = (select auth.uid()) AND admin_users_1.role = 'super-admin'::text
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users admin_users_1
    WHERE admin_users_1.user_id = (select auth.uid()) AND admin_users_1.role = 'super-admin'::text
  ));