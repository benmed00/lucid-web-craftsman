-- ============================================================================
-- Production Security Baseline Hardening
-- ============================================================================
-- This migration hardens Supabase access control without changing table shapes:
-- 1) Ensures RLS is enabled on all known public tables.
-- 2) Restricts app_settings reads to safe storefront keys or admins.
-- 3) Restricts security/log table inserts to admins only.
-- 4) Tightens storage policies for blog/review/error-report buckets.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Enforce RLS enabled for all known public tables
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.admin_order_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.artisan_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.artisans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.back_in_stock_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fraud_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fraud_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_customer_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_tickets_error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tag_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wishlist ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2) Restrict app_settings read surface (defense in depth)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "app_settings_select_restricted_keys_v2" ON public.app_settings;
CREATE POLICY "app_settings_select_restricted_keys_v2"
ON public.app_settings
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  is_admin_user((SELECT auth.uid()))
  OR setting_key = ANY (
    ARRAY[
      'business_rules',
      'display_settings',
      'free_shipping_threshold'
    ]::text[]
  )
);

-- ---------------------------------------------------------------------------
-- 3) Restrict log/security inserts to admin users only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_insert_admin_only_restrictive" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin_only_restrictive"
ON public.audit_logs
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "email_logs_insert_admin_only_restrictive" ON public.email_logs;
CREATE POLICY "email_logs_insert_admin_only_restrictive"
ON public.email_logs
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "security_events_insert_admin_only_restrictive" ON public.security_events;
CREATE POLICY "security_events_insert_admin_only_restrictive"
ON public.security_events
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "security_alerts_insert_admin_only_restrictive" ON public.security_alerts;
CREATE POLICY "security_alerts_insert_admin_only_restrictive"
ON public.security_alerts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

-- ---------------------------------------------------------------------------
-- 4) Storage hardening
-- ---------------------------------------------------------------------------
-- blog-images: writable only by admins.
DROP POLICY IF EXISTS "blog_images_admin_insert_restrictive" ON storage.objects;
CREATE POLICY "blog_images_admin_insert_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "blog_images_admin_update_restrictive" ON storage.objects;
CREATE POLICY "blog_images_admin_update_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "blog_images_admin_delete_restrictive" ON storage.objects;
CREATE POLICY "blog_images_admin_delete_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images'
  AND is_admin_user((SELECT auth.uid()))
);

-- review-photos: enforce path ownership for authenticated uploads/deletes.
DROP POLICY IF EXISTS "review_photos_owner_insert_restrictive" ON storage.objects;
CREATE POLICY "review_photos_owner_insert_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "review_photos_owner_delete_restrictive" ON storage.objects;
CREATE POLICY "review_photos_owner_delete_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- error-screenshots:
-- - authenticated users can only read their own files by owner folder, unless admin
-- - authenticated uploads must be to reports/<auth.uid()>/...
-- - anonymous uploads must be to reports/guest-<id>/...
DROP POLICY IF EXISTS "error_screenshots_select_restrictive" ON storage.objects;
CREATE POLICY "error_screenshots_select_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  bucket_id = 'error-screenshots'
  AND (
    is_admin_user((SELECT auth.uid()))
    OR (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
);

DROP POLICY IF EXISTS "error_screenshots_auth_insert_restrictive" ON storage.objects;
CREATE POLICY "error_screenshots_auth_insert_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'error-screenshots'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "error_screenshots_anon_insert_restrictive" ON storage.objects;
CREATE POLICY "error_screenshots_anon_insert_restrictive"
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'error-screenshots'
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] LIKE 'guest-%'
);
