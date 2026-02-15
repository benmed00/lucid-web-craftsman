
-- Drop unused indexes from previous migration and others
DROP INDEX IF EXISTS public.idx_aop_granted_by_fkey;
DROP INDEX IF EXISTS public.idx_fraud_assessments_override_by_fkey;
DROP INDEX IF EXISTS public.idx_hero_images_created_by;
DROP INDEX IF EXISTS public.idx_order_anomalies_escalated_to_fkey;
DROP INDEX IF EXISTS public.idx_order_anomalies_resolved_by_fkey;
DROP INDEX IF EXISTS public.idx_osh_changed_by_user_id_fkey;
DROP INDEX IF EXISTS public.idx_error_reports_user_id;
DROP INDEX IF EXISTS public.idx_error_reports_assigned_to_fkey;
DROP INDEX IF EXISTS public.idx_user_roles_revoked_by_fkey;

-- Create covering indexes for all unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_order_id ON public.checkout_sessions (order_id);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_created_by ON public.discount_coupons (created_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs (order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_order_id ON public.loyalty_redemptions (order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_reward_id ON public.loyalty_redemptions (reward_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user_id ON public.loyalty_redemptions (user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_checkout_session_id ON public.orders (checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics (product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON public.product_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories (category_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON public.products (artisan_id);
CREATE INDEX IF NOT EXISTS idx_security_config_created_by ON public.security_config (created_by);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON public.support_ticket_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON public.user_roles (granted_by);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist (product_id);
CREATE INDEX IF NOT EXISTS idx_admin_order_permissions_granted_by ON public.admin_order_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_override_by ON public.fraud_assessments (override_by);
CREATE INDEX IF NOT EXISTS idx_hero_images_created_by ON public.hero_images (created_by);
CREATE INDEX IF NOT EXISTS idx_order_anomalies_escalated_to ON public.order_anomalies (escalated_to);
CREATE INDEX IF NOT EXISTS idx_order_anomalies_resolved_by ON public.order_anomalies (resolved_by);
CREATE INDEX IF NOT EXISTS idx_osh_changed_by_user_id ON public.order_status_history (changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON public.support_tickets_error_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to ON public.support_tickets_error_reports (assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_by ON public.user_roles (revoked_by);
