
-- ============================================================
-- UNUSED INDEX CLEANUP - Categorized & Safe
-- ============================================================
-- STRATEGY:
--   DROP: Low-selectivity (booleans, enums), redundant singles 
--         covered by composites, admin-only tiny table FKs
--   KEEP: FK indexes on transactional/user tables, slug lookups,
--         composite indexes, RLS-critical indexes
-- ============================================================

-- ==========================================
-- CATEGORY 1: LOW-SELECTIVITY (booleans/enums) — SAFE TO DROP
-- These columns have <5 distinct values, making B-tree useless
-- ==========================================
DROP INDEX IF EXISTS public.idx_categories_active;           -- boolean
DROP INDEX IF EXISTS public.idx_products_stock;              -- numeric, rarely filtered alone
DROP INDEX IF EXISTS public.idx_products_rating;             -- numeric 0-5
DROP INDEX IF EXISTS public.idx_reviews_rating;              -- integer 1-5
DROP INDEX IF EXISTS public.idx_reviews_approved;            -- boolean
DROP INDEX IF EXISTS public.idx_loyalty_points_tier;         -- 4 values (bronze/silver/gold/platinum)
DROP INDEX IF EXISTS public.idx_payments_status;             -- ~5 statuses
DROP INDEX IF EXISTS public.idx_email_logs_status;           -- ~4 statuses
DROP INDEX IF EXISTS public.idx_email_logs_template;         -- ~6 templates
DROP INDEX IF EXISTS public.idx_email_ab_tests_status;       -- ~3 statuses
DROP INDEX IF EXISTS public.idx_payment_events_event_type;   -- ~5 types
DROP INDEX IF EXISTS public.idx_shipping_addresses_default;  -- boolean
DROP INDEX IF EXISTS public.idx_user_roles_role;             -- 3 values (customer/admin/super_admin)
DROP INDEX IF EXISTS public.idx_blog_post_translations_locale; -- 2-3 locales

-- ==========================================
-- CATEGORY 2: REDUNDANT (covered by composite indexes) — SAFE TO DROP
-- ==========================================
DROP INDEX IF EXISTS public.idx_analytics_product_id;        -- covered by idx_analytics_product_event_time(product_id, event_type, created_at)
DROP INDEX IF EXISTS public.idx_support_tickets_status;      -- covered by idx_support_tickets_status_created(status, created_at)
DROP INDEX IF EXISTS public.idx_support_tickets_created_at;  -- covered by idx_support_tickets_status_created(status, created_at)
DROP INDEX IF EXISTS public.idx_products_slug;               -- covered by idx_products_active_slug(slug) WHERE is_active

-- ==========================================
-- CATEGORY 3: ADMIN-ONLY TINY TABLE FKs — SAFE TO DROP
-- These FK columns reference auth.users on tables with <100 rows.
-- Full scans are negligible; index overhead > benefit.
-- ==========================================
DROP INDEX IF EXISTS public.idx_aop_granted_by_fkey;                -- admin_order_permissions.granted_by → users
DROP INDEX IF EXISTS public.idx_fraud_assessments_override_by_fkey; -- fraud_assessments.override_by → users
DROP INDEX IF EXISTS public.idx_order_anomalies_escalated_to_fkey;  -- order_anomalies.escalated_to → users
DROP INDEX IF EXISTS public.idx_order_anomalies_resolved_by_fkey;   -- order_anomalies.resolved_by → users
DROP INDEX IF EXISTS public.idx_osh_changed_by_user_id_fkey;        -- order_status_history.changed_by → users
DROP INDEX IF EXISTS public.idx_hero_images_created_by;             -- hero_images.created_by → profiles (tiny table)
DROP INDEX IF EXISTS public.idx_user_roles_revoked_by_fkey;         -- user_roles.revoked_by → users
DROP INDEX IF EXISTS public.idx_error_reports_assigned_to_fkey;     -- error_reports.assigned_to → users
DROP INDEX IF EXISTS public.idx_error_reports_user_id;              -- error_reports.user_id → users

-- ==========================================
-- CATEGORY 4: TINY TABLE OVERKILL — SAFE TO DROP
-- support_tickets_error_reports has minimal rows; composite/GIN indexes waste space
-- ==========================================
DROP INDEX IF EXISTS public.idx_error_reports_tags;                    -- GIN on array, tiny table
DROP INDEX IF EXISTS public.idx_error_reports_created_at;              -- single timestamp, tiny table
DROP INDEX IF EXISTS public.idx_error_reports_status_priority_created; -- composite on tiny table

-- ==========================================
-- CATEGORY 5: SPECIALIZED NICHE — SAFE TO DROP
-- ==========================================
DROP INDEX IF EXISTS public.idx_audit_logs_newsletter_access;  -- very specific partial index, never hit

-- ============================================================
-- KEPT INDEXES (not touched) — with rationale:
-- ============================================================
-- FK indexes on TRANSACTIONAL tables (prevent full scans on CASCADE):
--   idx_cart_items_product_id, idx_cart_items_user_id
--   idx_order_items_product_id, idx_checkout_sessions_order_id
--   idx_email_logs_order_id, idx_orders_checkout_session_id
--   idx_payment_events_order_id, idx_payments_stripe_intent
--
-- FK indexes on USER-FACING tables (RLS + JOIN performance):
--   idx_loyalty_points_user_id, idx_loyalty_transactions_user_id
--   idx_loyalty_redemptions_user_id, idx_loyalty_redemptions_reward_id
--   idx_loyalty_redemptions_order_id, idx_product_reviews_user_id
--   idx_wishlist_product_id, idx_wishlist_user_id
--   idx_product_categories_product_id, idx_product_categories_category_id
--
-- FK indexes on CONTENT tables:
--   idx_blog_posts_author_id, idx_blog_post_translations_blog_post_id
--   idx_product_translations_product_id, idx_categories_parent_id
--   idx_products_artisan_id_fkey
--
-- FK indexes on SUPPORT tables:
--   idx_stm_ticket_id_fkey, idx_stm_sender_id_fkey
--   idx_support_tickets_user_id, idx_support_tickets_assigned_to_fkey
--
-- LOOKUP indexes (slug, email, stripe):
--   idx_products_active_slug, idx_blog_posts_slug
--   idx_blog_posts_published_at, idx_newsletter_email
--   idx_payments_stripe_intent
--
-- COMPOSITE indexes (query pattern optimization):
--   idx_analytics_product_event_time, idx_analytics_session_created
--   idx_analytics_user_created, idx_support_tickets_status_created
--   idx_security_events_type_severity_created
--   idx_scheduled_emails_status_scheduled
--
-- RLS-CRITICAL:
--   idx_user_roles_user_id (used by has_role() in every RLS eval)
--   idx_user_roles_granted_by (audit trail FK)
--   idx_security_events_user_id (security audit FK)
--   idx_product_analytics_user_id_fkey (rate-limit RLS check)
