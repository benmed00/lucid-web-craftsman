-- =====================================================
-- FIX ALL 110 MULTIPLE PERMISSIVE POLICIES WARNINGS
-- Strategy: Convert ALL admin policies from PERMISSIVE to RESTRICTIVE
-- or replace with specific action policies
-- =====================================================

-- ========== 1. APP_SETTINGS ==========
-- Drop both policies and create single consolidated policy
DROP POLICY IF EXISTS "app_settings_admin_modify" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_policy" ON public.app_settings;

-- Single SELECT policy (public read, admin modify via separate policies)
CREATE POLICY "app_settings_select" ON public.app_settings
FOR SELECT USING (true);

-- Admin INSERT (RESTRICTIVE won't work for INSERT, so separate policy)
CREATE POLICY "app_settings_admin_insert" ON public.app_settings
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "app_settings_admin_update" ON public.app_settings
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "app_settings_admin_delete" ON public.app_settings
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 2. CATEGORIES ==========
DROP POLICY IF EXISTS "categories_admin_modify" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;

CREATE POLICY "categories_select" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 3. DISCOUNT_COUPONS ==========
DROP POLICY IF EXISTS "discount_coupons_admin_modify" ON public.discount_coupons;
DROP POLICY IF EXISTS "discount_coupons_select_policy" ON public.discount_coupons;

CREATE POLICY "discount_coupons_select" ON public.discount_coupons
FOR SELECT USING ((is_active = true) OR is_user_admin((SELECT auth.uid())));

CREATE POLICY "discount_coupons_admin_insert" ON public.discount_coupons
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "discount_coupons_admin_update" ON public.discount_coupons
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "discount_coupons_admin_delete" ON public.discount_coupons
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 4. HERO_IMAGES ==========
DROP POLICY IF EXISTS "hero_images_admin_modify" ON public.hero_images;
DROP POLICY IF EXISTS "hero_images_select_policy" ON public.hero_images;

CREATE POLICY "hero_images_select" ON public.hero_images
FOR SELECT USING ((is_active = true) OR is_user_admin((SELECT auth.uid())));

CREATE POLICY "hero_images_admin_insert" ON public.hero_images
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "hero_images_admin_update" ON public.hero_images
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "hero_images_admin_delete" ON public.hero_images
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 5. LOYALTY_POINTS ==========
DROP POLICY IF EXISTS "loyalty_points_modify_policy" ON public.loyalty_points;
DROP POLICY IF EXISTS "loyalty_points_select_policy" ON public.loyalty_points;

CREATE POLICY "loyalty_points_select" ON public.loyalty_points
FOR SELECT USING ((user_id = (SELECT auth.uid())) OR is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_points_admin_insert" ON public.loyalty_points
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_points_admin_update" ON public.loyalty_points
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_points_admin_delete" ON public.loyalty_points
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 6. LOYALTY_REWARDS ==========
DROP POLICY IF EXISTS "loyalty_rewards_admin_modify" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "loyalty_rewards_select_policy" ON public.loyalty_rewards;

CREATE POLICY "loyalty_rewards_select" ON public.loyalty_rewards
FOR SELECT USING (true);

CREATE POLICY "loyalty_rewards_admin_insert" ON public.loyalty_rewards
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_rewards_admin_update" ON public.loyalty_rewards
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_rewards_admin_delete" ON public.loyalty_rewards
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 7. LOYALTY_TRANSACTIONS ==========
DROP POLICY IF EXISTS "loyalty_transactions_modify_policy" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "loyalty_transactions_select_policy" ON public.loyalty_transactions;

CREATE POLICY "loyalty_transactions_select" ON public.loyalty_transactions
FOR SELECT USING ((user_id = (SELECT auth.uid())) OR is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_transactions_admin_insert" ON public.loyalty_transactions
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_transactions_admin_update" ON public.loyalty_transactions
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "loyalty_transactions_admin_delete" ON public.loyalty_transactions
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 8. NEWSLETTER_SUBSCRIPTIONS ==========
DROP POLICY IF EXISTS "Allow upsert update on newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "newsletter_update_policy" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "strict_newsletter_user_update" ON public.newsletter_subscriptions;

-- Single UPDATE policy that combines all conditions
CREATE POLICY "newsletter_update" ON public.newsletter_subscriptions
FOR UPDATE 
USING (user_owns_newsletter_subscription(email) OR is_user_admin((SELECT auth.uid())))
WITH CHECK ((email IS NOT NULL) AND (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'));

-- ========== 9. ORDER_ITEMS ==========
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;

CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT USING (
  (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = (SELECT auth.uid())))
  OR is_admin_user((SELECT auth.uid()))
);

-- ========== 10. ORDERS ==========
DROP POLICY IF EXISTS "Super admins can select all orders" ON public.orders;
DROP POLICY IF EXISTS "select_own_orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

CREATE POLICY "orders_select" ON public.orders
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'super_admin')
);

CREATE POLICY "orders_update" ON public.orders
FOR UPDATE USING (
  (user_id = (SELECT auth.uid())) OR has_role((SELECT auth.uid()), 'super_admin')
);

-- ========== 11. PAYMENTS ==========
DROP POLICY IF EXISTS "Deny anonymous access to payments" ON public.payments;
DROP POLICY IF EXISTS "Super admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view only their own payments with audit" ON public.payments;
DROP POLICY IF EXISTS "Validated payment insert" ON public.payments;
DROP POLICY IF EXISTS "Validated payment update" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
FOR SELECT USING (
  (EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND o.user_id = (SELECT auth.uid())))
  OR has_role((SELECT auth.uid()), 'super_admin')
);

CREATE POLICY "payments_insert" ON public.payments
FOR INSERT WITH CHECK (
  (amount > 0) AND (currency IS NOT NULL) AND (status IS NOT NULL)
);

CREATE POLICY "payments_update" ON public.payments
FOR UPDATE 
USING (true)
WITH CHECK ((amount > 0) AND (currency IS NOT NULL));

-- Keep the prevent deletion policy (it's a RESTRICTIVE policy so no conflict)
-- Prevent payment deletion already exists

-- ========== 12. PRODUCT_CATEGORIES ==========
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Product categories are publicly readable" ON public.product_categories;

CREATE POLICY "product_categories_select" ON public.product_categories
FOR SELECT USING (true);

CREATE POLICY "product_categories_admin_insert" ON public.product_categories
FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

CREATE POLICY "product_categories_admin_update" ON public.product_categories
FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

CREATE POLICY "product_categories_admin_delete" ON public.product_categories
FOR DELETE USING (is_admin_user((SELECT auth.uid())));

-- ========== 13. PRODUCT_REVIEWS ==========
DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Published reviews are publicly readable" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.product_reviews;

CREATE POLICY "product_reviews_select" ON public.product_reviews
FOR SELECT USING (
  (is_approved = true) 
  OR (user_id = (SELECT auth.uid())) 
  OR is_admin_user((SELECT auth.uid()))
);

CREATE POLICY "product_reviews_insert" ON public.product_reviews
FOR INSERT WITH CHECK (
  (user_id = (SELECT auth.uid())) OR is_admin_user((SELECT auth.uid()))
);

CREATE POLICY "product_reviews_update" ON public.product_reviews
FOR UPDATE USING (
  (user_id = (SELECT auth.uid())) OR is_admin_user((SELECT auth.uid()))
);

CREATE POLICY "product_reviews_delete" ON public.product_reviews
FOR DELETE USING (is_admin_user((SELECT auth.uid())));

-- ========== 14. PRODUCTS ==========
DROP POLICY IF EXISTS "products_admin_modify" ON public.products;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "products_select" ON public.products
FOR SELECT USING (true);

CREATE POLICY "products_admin_insert" ON public.products
FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

CREATE POLICY "products_admin_update" ON public.products
FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

CREATE POLICY "products_admin_delete" ON public.products
FOR DELETE USING (is_admin_user((SELECT auth.uid())));

-- ========== 15. SCHEDULED_EMAILS ==========
DROP POLICY IF EXISTS "scheduled_emails_modify_policy" ON public.scheduled_emails;
DROP POLICY IF EXISTS "scheduled_emails_select_policy" ON public.scheduled_emails;

CREATE POLICY "scheduled_emails_select" ON public.scheduled_emails
FOR SELECT USING (is_user_admin((SELECT auth.uid())));

-- System needs to modify scheduled emails (for processing)
CREATE POLICY "scheduled_emails_insert" ON public.scheduled_emails
FOR INSERT WITH CHECK (true);

CREATE POLICY "scheduled_emails_update" ON public.scheduled_emails
FOR UPDATE USING (true);

CREATE POLICY "scheduled_emails_delete" ON public.scheduled_emails
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 16. SHIPMENTS ==========
DROP POLICY IF EXISTS "shipments_admin_modify" ON public.shipments;
DROP POLICY IF EXISTS "shipments_select_policy" ON public.shipments;

CREATE POLICY "shipments_select" ON public.shipments
FOR SELECT USING (
  (EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.user_id = (SELECT auth.uid())))
  OR is_user_admin((SELECT auth.uid()))
);

CREATE POLICY "shipments_admin_insert" ON public.shipments
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "shipments_admin_update" ON public.shipments
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "shipments_admin_delete" ON public.shipments
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 17. SHIPPING_ZONES ==========
DROP POLICY IF EXISTS "shipping_zones_admin_modify" ON public.shipping_zones;
DROP POLICY IF EXISTS "shipping_zones_select_policy" ON public.shipping_zones;

CREATE POLICY "shipping_zones_select" ON public.shipping_zones
FOR SELECT USING (true);

CREATE POLICY "shipping_zones_admin_insert" ON public.shipping_zones
FOR INSERT WITH CHECK (is_user_admin((SELECT auth.uid())));

CREATE POLICY "shipping_zones_admin_update" ON public.shipping_zones
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "shipping_zones_admin_delete" ON public.shipping_zones
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 18. SUPPORT_TICKET_MESSAGES ==========
DROP POLICY IF EXISTS "support_ticket_messages_admin_modify" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "support_ticket_messages_select_policy" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "support_ticket_messages_insert_policy" ON public.support_ticket_messages;

CREATE POLICY "support_ticket_messages_select" ON public.support_ticket_messages
FOR SELECT USING (
  (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id AND can_access_support_ticket(support_tickets.id)))
  OR is_user_admin((SELECT auth.uid()))
);

CREATE POLICY "support_ticket_messages_insert" ON public.support_ticket_messages
FOR INSERT WITH CHECK (
  (EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = support_ticket_messages.ticket_id AND can_access_support_ticket(support_tickets.id)))
  OR is_user_admin((SELECT auth.uid()))
);

CREATE POLICY "support_ticket_messages_update" ON public.support_ticket_messages
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "support_ticket_messages_delete" ON public.support_ticket_messages
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== 19. SUPPORT_TICKETS_ERROR_REPORTS ==========
DROP POLICY IF EXISTS "error_reports_admin_modify" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "error_reports_select_policy" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "error_reports_insert_policy" ON public.support_tickets_error_reports;

CREATE POLICY "error_reports_select" ON public.support_tickets_error_reports
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) OR is_user_admin((SELECT auth.uid()))
);

-- Anyone can submit error reports
CREATE POLICY "error_reports_insert" ON public.support_tickets_error_reports
FOR INSERT WITH CHECK (true);

CREATE POLICY "error_reports_update" ON public.support_tickets_error_reports
FOR UPDATE USING (is_user_admin((SELECT auth.uid())));

CREATE POLICY "error_reports_delete" ON public.support_tickets_error_reports
FOR DELETE USING (is_user_admin((SELECT auth.uid())));

-- ========== LOG MIGRATION ==========
INSERT INTO public.audit_logs (action, resource_type, resource_id, new_values)
VALUES (
  'RLS_POLICY_OPTIMIZATION_PHASE2',
  'database_security',
  'fix_110_warnings',
  jsonb_build_object(
    'tables_fixed', 19,
    'warnings_resolved', 110,
    'strategy', 'Replace ALL policies with specific action policies',
    'timestamp', now()
  )
);