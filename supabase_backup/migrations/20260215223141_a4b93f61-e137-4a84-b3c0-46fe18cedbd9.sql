
-- ============================================================================
-- RLS CONSOLIDATION: Fix all multiple_permissive_policies warnings
-- ============================================================================
-- Tables: admin_order_permissions, artisan_translations, artisans,
--         checkout_sessions, loyalty_transactions, order_status_history,
--         product_analytics
-- Strategy: 1 policy per (table, action). Roles: anon + authenticated only.
-- ============================================================================

-- ============================================================================
-- 1. admin_order_permissions
-- Before: 2 permissive (SELECT + ALL) on {public} = warnings for 4 roles
-- After:  4 policies on authenticated only
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read order permissions" ON public.admin_order_permissions;
DROP POLICY IF EXISTS "Super admins manage order permissions" ON public.admin_order_permissions;

CREATE POLICY "aop_select"
ON public.admin_order_permissions FOR SELECT
TO authenticated
USING (is_admin_user((SELECT auth.uid())));

CREATE POLICY "aop_insert"
ON public.admin_order_permissions FOR INSERT
TO authenticated
WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE POLICY "aop_update"
ON public.admin_order_permissions FOR UPDATE
TO authenticated
USING (has_role((SELECT auth.uid()), 'super_admin'::app_role))
WITH CHECK (has_role((SELECT auth.uid()), 'super_admin'::app_role));

CREATE POLICY "aop_delete"
ON public.admin_order_permissions FOR DELETE
TO authenticated
USING (has_role((SELECT auth.uid()), 'super_admin'::app_role));

-- ============================================================================
-- 2. artisan_translations
-- Before: ALL({public}) + SELECT({public}) = 2 SELECT on every role
-- After:  1 SELECT (anon+auth) + 3 write policies (auth only)
-- ============================================================================

DROP POLICY IF EXISTS "Admins manage artisan translations" ON public.artisan_translations;
DROP POLICY IF EXISTS "Artisan translations viewable" ON public.artisan_translations;

CREATE POLICY "at_select"
ON public.artisan_translations FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "at_insert"
ON public.artisan_translations FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

CREATE POLICY "at_update"
ON public.artisan_translations FOR UPDATE
TO authenticated
USING (is_admin_user((SELECT auth.uid())));

CREATE POLICY "at_delete"
ON public.artisan_translations FOR DELETE
TO authenticated
USING (is_admin_user((SELECT auth.uid())));

-- ============================================================================
-- 3. artisans
-- Before: ALL({public}) + SELECT({public}) = 2 SELECT on every role
-- After:  1 SELECT (anon+auth) + 3 write policies (auth only)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage artisans" ON public.artisans;
DROP POLICY IF EXISTS "Artisans are viewable by everyone" ON public.artisans;

CREATE POLICY "artisans_select"
ON public.artisans FOR SELECT
TO anon, authenticated
USING (is_active = true OR is_admin_user((SELECT auth.uid())));

CREATE POLICY "artisans_insert"
ON public.artisans FOR INSERT
TO authenticated
WITH CHECK (is_admin_user((SELECT auth.uid())));

CREATE POLICY "artisans_update"
ON public.artisans FOR UPDATE
TO authenticated
USING (is_admin_user((SELECT auth.uid())));

CREATE POLICY "artisans_delete"
ON public.artisans FOR DELETE
TO authenticated
USING (is_admin_user((SELECT auth.uid())));

-- ============================================================================
-- 4. checkout_sessions
-- Before: 3 SELECT + 2 INSERT + 3 UPDATE on {public} = massive duplication
-- After:  1 SELECT + 1 INSERT + 1 UPDATE on anon+authenticated
-- ============================================================================

DROP POLICY IF EXISTS "checkout_sessions_admin_select" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_guest_select" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_user_select" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_guest_insert" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_user_insert" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_admin_update" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_guest_update" ON public.checkout_sessions;
DROP POLICY IF EXISTS "checkout_sessions_user_update" ON public.checkout_sessions;

-- SELECT: admin OR owner OR active guest session
CREATE POLICY "cs_select"
ON public.checkout_sessions FOR SELECT
TO anon, authenticated
USING (
  is_admin_user((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
  OR (
    guest_id IS NOT NULL
    AND guest_id = get_request_guest_id()
    AND (expires_at IS NULL OR expires_at > now())
    AND status NOT IN ('completed', 'abandoned')
  )
);

-- INSERT: owner or guest
CREATE POLICY "cs_insert"
ON public.checkout_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (guest_id IS NOT NULL AND guest_id = get_request_guest_id())
);

-- UPDATE: admin OR owner OR active guest
CREATE POLICY "cs_update"
ON public.checkout_sessions FOR UPDATE
TO anon, authenticated
USING (
  is_admin_user((SELECT auth.uid()))
  OR user_id = (SELECT auth.uid())
  OR (
    guest_id IS NOT NULL
    AND guest_id = get_request_guest_id()
    AND (expires_at IS NULL OR expires_at > now())
    AND status NOT IN ('completed', 'abandoned')
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR (guest_id IS NOT NULL AND guest_id = get_request_guest_id())
  OR is_admin_user((SELECT auth.uid()))
);

-- ============================================================================
-- 5. loyalty_transactions
-- Before: 2 INSERT on {public} (both permissive) = warning
-- After:  1 INSERT on authenticated only
-- Note:   Restrictive deny_anonymous already blocks anon
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can insert own loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "loyalty_transactions_admin_insert" ON public.loyalty_transactions;

CREATE POLICY "lt_insert"
ON public.loyalty_transactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR is_admin_user((SELECT auth.uid()))
);

-- ============================================================================
-- 6. order_status_history
-- Before: 2 SELECT on {public} = warning for all roles
-- After:  1 SELECT on authenticated
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all order history" ON public.order_status_history;
DROP POLICY IF EXISTS "Customers can read own order history" ON public.order_status_history;

CREATE POLICY "osh_select"
ON public.order_status_history FOR SELECT
TO authenticated
USING (
  is_admin_user((SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_status_history.order_id
    AND o.user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- 7. product_analytics
-- Before: 3 INSERT policies (anon-specific + 2x {public}) = warning
-- After:  1 INSERT for anon + 1 INSERT for authenticated (no overlap)
-- ============================================================================

DROP POLICY IF EXISTS "Allow anonymous rate-limited analytics inserts" ON public.product_analytics;
DROP POLICY IF EXISTS "Allow authenticated rate-limited analytics inserts" ON public.product_analytics;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.product_analytics;

-- Anon: rate-limited by session, event type validated
CREATE POLICY "pa_insert_anon"
ON public.product_analytics FOR INSERT
TO anon
WITH CHECK (
  session_id IS NOT NULL
  AND event_type IS NOT NULL
  AND event_type = ANY (ARRAY['view','click','add_to_cart','purchase','wishlist_add','share'])
  AND (SELECT count(*) < 20
       FROM product_analytics pa
       WHERE pa.session_id = product_analytics.session_id
       AND pa.created_at > now() - interval '1 minute')
);

-- Authenticated: rate-limited by user, event type validated
CREATE POLICY "pa_insert_auth"
ON public.product_analytics FOR INSERT
TO authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND event_type = ANY (ARRAY['view','click','add_to_cart','purchase','wishlist_add','share'])
  AND (SELECT count(*) < 100
       FROM product_analytics pa
       WHERE pa.user_id = (SELECT auth.uid())
       AND pa.created_at > now() - interval '1 minute')
);
