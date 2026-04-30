
-- ============================================================================
-- PART 1: Re-create indexes for unindexed foreign keys
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_aop_granted_by_fkey ON public.admin_order_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_override_by_fkey ON public.fraud_assessments (override_by);
CREATE INDEX IF NOT EXISTS idx_hero_images_created_by ON public.hero_images (created_by);
CREATE INDEX IF NOT EXISTS idx_order_anomalies_escalated_to_fkey ON public.order_anomalies (escalated_to);
CREATE INDEX IF NOT EXISTS idx_order_anomalies_resolved_by_fkey ON public.order_anomalies (resolved_by);
CREATE INDEX IF NOT EXISTS idx_osh_changed_by_user_id_fkey ON public.order_status_history (changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON public.support_tickets_error_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to_fkey ON public.support_tickets_error_reports (assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_by_fkey ON public.user_roles (revoked_by);
-- Note: support_tickets_error_reports has two FKs on user_id (fk_error_reports_user + user_id_fkey),
-- one index covers both.

-- ============================================================================
-- PART 2: Drop all unused indexes
-- ============================================================================
-- product_analytics (4)
DROP INDEX IF EXISTS public.idx_product_analytics_user_id_fkey;
DROP INDEX IF EXISTS public.idx_analytics_product_event_time;
DROP INDEX IF EXISTS public.idx_analytics_session_created;
DROP INDEX IF EXISTS public.idx_analytics_user_created;

-- products (2)
DROP INDEX IF EXISTS public.idx_products_artisan_id_fkey;
DROP INDEX IF EXISTS public.idx_products_active_slug;

-- support_ticket_messages (2)
DROP INDEX IF EXISTS public.idx_stm_sender_id_fkey;
DROP INDEX IF EXISTS public.idx_stm_ticket_id_fkey;

-- support_tickets (4)
DROP INDEX IF EXISTS public.idx_support_tickets_assigned_to_fkey;
DROP INDEX IF EXISTS public.idx_support_tickets_status_created;
DROP INDEX IF EXISTS public.idx_support_tickets_user_id;

-- security_events (2)
DROP INDEX IF EXISTS public.idx_security_events_type_severity_created;
DROP INDEX IF EXISTS public.idx_security_events_user_id;

-- user_roles (3)
DROP INDEX IF EXISTS public.idx_user_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_roles_granted_by;

-- payments (2)
DROP INDEX IF EXISTS public.idx_payments_stripe_intent;
DROP INDEX IF EXISTS public.idx_payments_created_at;

-- blog_posts (3)
DROP INDEX IF EXISTS public.idx_blog_posts_slug;
DROP INDEX IF EXISTS public.idx_blog_posts_published_at;
DROP INDEX IF EXISTS public.idx_blog_posts_author_id;

-- newsletter_subscriptions (1)
DROP INDEX IF EXISTS public.idx_newsletter_email;

-- categories (1)
DROP INDEX IF EXISTS public.idx_categories_parent_id;

-- order_items (1)
DROP INDEX IF EXISTS public.idx_order_items_product_id;

-- shipping_zones (1)
DROP INDEX IF EXISTS public.idx_shipping_zones_postal_codes;

-- checkout_sessions (1)
DROP INDEX IF EXISTS public.idx_checkout_sessions_order_id;

-- orders (1)
DROP INDEX IF EXISTS public.idx_orders_checkout_session_id;

-- cart_items (2)
DROP INDEX IF EXISTS public.idx_cart_items_product_id;
DROP INDEX IF EXISTS public.idx_cart_items_user_id;

-- payment_events (1)
DROP INDEX IF EXISTS public.idx_payment_events_order_id;

-- product_translations (1)
DROP INDEX IF EXISTS public.idx_product_translations_product_id;

-- blog_post_translations (1)
DROP INDEX IF EXISTS public.idx_blog_post_translations_blog_post_id;

-- scheduled_emails (1)
DROP INDEX IF EXISTS public.idx_scheduled_emails_status_scheduled;

-- email_logs (1)
DROP INDEX IF EXISTS public.idx_email_logs_order_id;

-- product_reviews (1)
DROP INDEX IF EXISTS public.idx_product_reviews_user_id;

-- wishlist (2)
DROP INDEX IF EXISTS public.idx_wishlist_product_id;
DROP INDEX IF EXISTS public.idx_wishlist_user_id;

-- product_categories (2)
DROP INDEX IF EXISTS public.idx_product_categories_product_id;
DROP INDEX IF EXISTS public.idx_product_categories_category_id;

-- loyalty (5)
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_reward_id;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_order_id;
DROP INDEX IF EXISTS public.idx_loyalty_points_user_id;
DROP INDEX IF EXISTS public.idx_loyalty_transactions_user_id;
DROP INDEX IF EXISTS public.idx_loyalty_redemptions_user_id;

-- discount_coupons (1)
DROP INDEX IF EXISTS public.idx_discount_coupons_created_by;

-- security_config (1)
DROP INDEX IF EXISTS public.idx_security_config_created_by;

-- fraud_rules (1)
DROP INDEX IF EXISTS public.idx_fraud_rules_active;
