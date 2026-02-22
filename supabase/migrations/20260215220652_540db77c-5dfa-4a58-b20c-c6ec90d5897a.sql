
-- ============================================================
-- RLS InitPlan Performance Optimization Migration
-- Wraps all bare auth.uid() / has_role(auth.uid(),...) calls
-- in (SELECT ...) to enable Postgres initplan optimization.
-- This ensures auth functions are evaluated ONCE per query
-- instead of per-row.
-- ============================================================

-- ==================== admin_order_permissions ====================
DROP POLICY IF EXISTS "Admins can read order permissions" ON public.admin_order_permissions;
CREATE POLICY "Admins can read order permissions" ON public.admin_order_permissions
  FOR SELECT USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Super admins manage order permissions" ON public.admin_order_permissions;
CREATE POLICY "Super admins manage order permissions" ON public.admin_order_permissions
  FOR ALL USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== admin_users ====================
DROP POLICY IF EXISTS "admin_users_select_super_admin_only" ON public.admin_users;
CREATE POLICY "admin_users_select_super_admin_only" ON public.admin_users
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== artisan_translations ====================
DROP POLICY IF EXISTS "Admins manage artisan translations" ON public.artisan_translations;
CREATE POLICY "Admins manage artisan translations" ON public.artisan_translations
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (SELECT auth.uid())));

-- ==================== artisans ====================
DROP POLICY IF EXISTS "Admins can manage artisans" ON public.artisans;
CREATE POLICY "Admins can manage artisans" ON public.artisans
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (SELECT auth.uid())));

-- ==================== audit_logs ====================
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "super_admin_select_audit_logs" ON public.audit_logs;
CREATE POLICY "super_admin_select_audit_logs" ON public.audit_logs
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== blog_post_translations ====================
DROP POLICY IF EXISTS "blog_post_translations_admin_delete" ON public.blog_post_translations;
CREATE POLICY "blog_post_translations_admin_delete" ON public.blog_post_translations
  FOR DELETE USING (is_user_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "blog_post_translations_admin_insert" ON public.blog_post_translations;
CREATE POLICY "blog_post_translations_admin_insert" ON public.blog_post_translations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM blog_posts bp
    WHERE bp.id = blog_post_translations.blog_post_id
    AND (bp.author_id = (SELECT auth.uid()) OR is_user_admin((SELECT auth.uid())))));

DROP POLICY IF EXISTS "blog_post_translations_admin_update" ON public.blog_post_translations;
CREATE POLICY "blog_post_translations_admin_update" ON public.blog_post_translations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM blog_posts bp
    WHERE bp.id = blog_post_translations.blog_post_id
    AND (bp.author_id = (SELECT auth.uid()) OR is_user_admin((SELECT auth.uid())))));

DROP POLICY IF EXISTS "blog_post_translations_select" ON public.blog_post_translations;
CREATE POLICY "blog_post_translations_select" ON public.blog_post_translations
  FOR SELECT USING (EXISTS (SELECT 1 FROM blog_posts bp
    WHERE bp.id = blog_post_translations.blog_post_id
    AND (bp.status = 'published' OR bp.author_id = (SELECT auth.uid()) OR is_user_admin((SELECT auth.uid())))));

-- ==================== checkout_sessions ====================
DROP POLICY IF EXISTS "checkout_sessions_admin_select" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_admin_select" ON public.checkout_sessions
  FOR SELECT USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "checkout_sessions_admin_update" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_admin_update" ON public.checkout_sessions
  FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "checkout_sessions_user_insert" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_user_insert" ON public.checkout_sessions
  FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid())) OR (guest_id IS NOT NULL AND guest_id = get_request_guest_id()));

DROP POLICY IF EXISTS "checkout_sessions_user_select" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_user_select" ON public.checkout_sessions
  FOR SELECT USING ((user_id = (SELECT auth.uid())) OR is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "checkout_sessions_user_update" ON public.checkout_sessions;
CREATE POLICY "checkout_sessions_user_update" ON public.checkout_sessions
  FOR UPDATE USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ==================== contact_messages ====================
DROP POLICY IF EXISTS "super_admin_delete_only" ON public.contact_messages;
CREATE POLICY "super_admin_delete_only" ON public.contact_messages
  FOR DELETE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin_select_only" ON public.contact_messages;
CREATE POLICY "super_admin_select_only" ON public.contact_messages
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin_update_only" ON public.contact_messages;
CREATE POLICY "super_admin_update_only" ON public.contact_messages
  FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== email_logs ====================
DROP POLICY IF EXISTS "authenticated_insert_email_logs" ON public.email_logs;
CREATE POLICY "authenticated_insert_email_logs" ON public.email_logs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "super_admin_select_email_logs" ON public.email_logs;
CREATE POLICY "super_admin_select_email_logs" ON public.email_logs
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin_update_email_logs" ON public.email_logs;
CREATE POLICY "super_admin_update_email_logs" ON public.email_logs
  FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== fraud_assessments ====================
DROP POLICY IF EXISTS "Admins can insert fraud assessments" ON public.fraud_assessments;
CREATE POLICY "Admins can insert fraud assessments" ON public.fraud_assessments
  FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can view fraud assessments" ON public.fraud_assessments;
CREATE POLICY "Admins can view fraud assessments" ON public.fraud_assessments
  FOR SELECT USING (is_admin_user((SELECT auth.uid())));

-- ==================== fraud_rules ====================
DROP POLICY IF EXISTS "Admins can manage fraud rules" ON public.fraud_rules;
CREATE POLICY "Admins can manage fraud rules" ON public.fraud_rules
  FOR ALL USING (is_admin_user((SELECT auth.uid())));

-- ==================== loyalty_transactions ====================
DROP POLICY IF EXISTS "Authenticated users can insert own loyalty transactions" ON public.loyalty_transactions;
CREATE POLICY "Authenticated users can insert own loyalty transactions" ON public.loyalty_transactions
  FOR INSERT WITH CHECK ((user_id = (SELECT auth.uid())) OR is_admin_user((SELECT auth.uid())));

-- ==================== newsletter_subscriptions ====================
DROP POLICY IF EXISTS "newsletter_select_strict_v2" ON public.newsletter_subscriptions;
CREATE POLICY "newsletter_select_strict_v2" ON public.newsletter_subscriptions
  FOR SELECT USING ((email = get_auth_user_email()) OR has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== order_anomalies ====================
DROP POLICY IF EXISTS "Admins can manage order anomalies" ON public.order_anomalies;
CREATE POLICY "Admins can manage order anomalies" ON public.order_anomalies
  FOR ALL USING (is_admin_user((SELECT auth.uid())));

-- ==================== order_items ====================
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;
CREATE POLICY "Users can insert their own order items" ON public.order_items
  FOR INSERT WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = (SELECT auth.uid())));

-- ==================== order_status_history ====================
DROP POLICY IF EXISTS "Admins can read all order history" ON public.order_status_history;
CREATE POLICY "Admins can read all order history" ON public.order_status_history
  FOR SELECT USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Customers can read own order history" ON public.order_status_history;
CREATE POLICY "Customers can read own order history" ON public.order_status_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id AND o.user_id = (SELECT auth.uid())));

-- ==================== payment_events ====================
DROP POLICY IF EXISTS "Admins can insert payment events" ON public.payment_events;
CREATE POLICY "Admins can insert payment events" ON public.payment_events
  FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can read payment events" ON public.payment_events;
CREATE POLICY "Admins can read payment events" ON public.payment_events
  FOR SELECT USING (is_admin_user((SELECT auth.uid())));

-- ==================== payments ====================
DROP POLICY IF EXISTS "Only admins can update payments" ON public.payments;
CREATE POLICY "Only admins can update payments" ON public.payments
  FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== product_analytics ====================
DROP POLICY IF EXISTS "Allow authenticated rate-limited analytics inserts" ON public.product_analytics;
CREATE POLICY "Allow authenticated rate-limited analytics inserts" ON public.product_analytics
  FOR INSERT WITH CHECK (((SELECT auth.uid()) IS NOT NULL) AND (SELECT count(*) < 100
    FROM product_analytics pa
    WHERE pa.session_id = product_analytics.session_id
    AND pa.created_at > (now() - interval '1 minute')));

-- ==================== product_translations ====================
DROP POLICY IF EXISTS "product_translations_admin_delete" ON public.product_translations;
CREATE POLICY "product_translations_admin_delete" ON public.product_translations
  FOR DELETE USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "product_translations_admin_insert" ON public.product_translations;
CREATE POLICY "product_translations_admin_insert" ON public.product_translations
  FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "product_translations_admin_update" ON public.product_translations;
CREATE POLICY "product_translations_admin_update" ON public.product_translations
  FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

-- ==================== profiles ====================
DROP POLICY IF EXISTS "profiles_select_strict" ON public.profiles;
CREATE POLICY "profiles_select_strict" ON public.profiles
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'super_admin'::app_role)
  );

-- ==================== rate_limits ====================
DROP POLICY IF EXISTS "admin_only_rate_limits_select" ON public.rate_limits;
CREATE POLICY "admin_only_rate_limits_select" ON public.rate_limits
  FOR SELECT USING (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "rate_limits_admin_delete" ON public.rate_limits;
CREATE POLICY "rate_limits_admin_delete" ON public.rate_limits
  FOR DELETE USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "rate_limits_admin_insert" ON public.rate_limits;
CREATE POLICY "rate_limits_admin_insert" ON public.rate_limits
  FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "rate_limits_admin_update" ON public.rate_limits;
CREATE POLICY "rate_limits_admin_update" ON public.rate_limits
  FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

-- ==================== scheduled_emails ====================
DROP POLICY IF EXISTS "scheduled_emails_insert" ON public.scheduled_emails;
CREATE POLICY "scheduled_emails_insert" ON public.scheduled_emails
  FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())) AND recipient_email IS NOT NULL AND template_name IS NOT NULL AND scheduled_for IS NOT NULL);

DROP POLICY IF EXISTS "scheduled_emails_update" ON public.scheduled_emails;
CREATE POLICY "scheduled_emails_update" ON public.scheduled_emails
  FOR UPDATE USING (is_admin_user((SELECT auth.uid())))
  WITH CHECK (recipient_email IS NOT NULL AND template_name IS NOT NULL);

-- ==================== security_alerts ====================
DROP POLICY IF EXISTS "authenticated_insert_security_alerts" ON public.security_alerts;
CREATE POLICY "authenticated_insert_security_alerts" ON public.security_alerts
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "super_admin_select_security_alerts" ON public.security_alerts;
CREATE POLICY "super_admin_select_security_alerts" ON public.security_alerts
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin_update_security_alerts" ON public.security_alerts;
CREATE POLICY "super_admin_update_security_alerts" ON public.security_alerts
  FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== security_events ====================
DROP POLICY IF EXISTS "authenticated_insert_security_events" ON public.security_events;
CREATE POLICY "authenticated_insert_security_events" ON public.security_events
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "super_admin_select_security_events" ON public.security_events;
CREATE POLICY "super_admin_select_security_events" ON public.security_events
  FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

DROP POLICY IF EXISTS "super_admin_update_security_events" ON public.security_events;
CREATE POLICY "super_admin_update_security_events" ON public.security_events
  FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
  WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ==================== shipping_addresses ====================
DROP POLICY IF EXISTS "shipping_addresses_select_strict" ON public.shipping_addresses;
CREATE POLICY "shipping_addresses_select_strict" ON public.shipping_addresses
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'super_admin'::app_role)
  );

-- ==================== tag_translations ====================
DROP POLICY IF EXISTS "Admins can delete tag translations" ON public.tag_translations;
CREATE POLICY "Admins can delete tag translations" ON public.tag_translations
  FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can insert tag translations" ON public.tag_translations;
CREATE POLICY "Admins can insert tag translations" ON public.tag_translations
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update tag translations" ON public.tag_translations;
CREATE POLICY "Admins can update tag translations" ON public.tag_translations
  FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.user_id = (SELECT auth.uid())));

-- ==================== support_tickets_error_reports ====================
DROP POLICY IF EXISTS "error_reports_insert" ON public.support_tickets_error_reports;
CREATE POLICY "error_reports_insert" ON public.support_tickets_error_reports
  FOR INSERT WITH CHECK (
    description IS NOT NULL
    AND check_rate_limit(
      COALESCE((SELECT auth.uid())::text, inet_client_addr()::text, 'unknown'),
      'error_report', 10, 60
    )
  );

-- ==================== INDEXES for RLS performance ====================
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user_id ON public.checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_guest_id ON public.checkout_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_translations_blog_post_id ON public.blog_post_translations(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_product_translations_product_id ON public.product_translations(product_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
