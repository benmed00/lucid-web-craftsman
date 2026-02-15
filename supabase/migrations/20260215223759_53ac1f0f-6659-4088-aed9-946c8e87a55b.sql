
-- ============================================================================
-- INDEX OPTIMIZATION: FK coverage + cleanup of redundant indexes
-- ============================================================================

-- ============================================================================
-- PART 1: Add missing FK indexes
-- ============================================================================

-- admin_order_permissions.granted_by (FK, no index)
CREATE INDEX IF NOT EXISTS idx_aop_granted_by_fkey
ON public.admin_order_permissions USING btree (granted_by);

-- fraud_assessments.override_by (FK, no index)
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_override_by_fkey
ON public.fraud_assessments USING btree (override_by);

-- order_anomalies.escalated_to (FK, no index)
CREATE INDEX IF NOT EXISTS idx_order_anomalies_escalated_to_fkey
ON public.order_anomalies USING btree (escalated_to);

-- order_anomalies.resolved_by (FK, no index)
CREATE INDEX IF NOT EXISTS idx_order_anomalies_resolved_by_fkey
ON public.order_anomalies USING btree (resolved_by);

-- order_status_history.changed_by_user_id (FK, no index)
CREATE INDEX IF NOT EXISTS idx_osh_changed_by_user_id_fkey
ON public.order_status_history USING btree (changed_by_user_id);

-- product_analytics.user_id (FK, no index)
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id_fkey
ON public.product_analytics USING btree (user_id);

-- products.artisan_id (FK, no index)
CREATE INDEX IF NOT EXISTS idx_products_artisan_id_fkey
ON public.products USING btree (artisan_id);

-- support_ticket_messages.sender_id (FK, no index)
CREATE INDEX IF NOT EXISTS idx_stm_sender_id_fkey
ON public.support_ticket_messages USING btree (sender_id);

-- support_ticket_messages.ticket_id (FK, no index)
CREATE INDEX IF NOT EXISTS idx_stm_ticket_id_fkey
ON public.support_ticket_messages USING btree (ticket_id);

-- support_tickets.assigned_to (FK, no index)
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to_fkey
ON public.support_tickets USING btree (assigned_to);

-- support_tickets_error_reports.assigned_to (FK, no index)
CREATE INDEX IF NOT EXISTS idx_error_reports_assigned_to_fkey
ON public.support_tickets_error_reports USING btree (assigned_to);

-- user_roles.revoked_by (FK, no index)
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_by_fkey
ON public.user_roles USING btree (revoked_by);

-- ============================================================================
-- PART 2: Drop truly redundant indexes (duplicates of PK or UNIQUE)
-- ============================================================================

-- idx_admin_users_user_id duplicates admin_users_user_id_unique (UNIQUE)
DROP INDEX IF EXISTS public.idx_admin_users_user_id;

-- idx_profiles_id duplicates profiles PK (profiles_pkey on id)
DROP INDEX IF EXISTS public.idx_profiles_id;

-- ============================================================================
-- PART 3: Drop unused single-column low-selectivity indexes
-- These have 0 scans, low cardinality, and are not FK-backing
-- ============================================================================

-- profiles: phone/city/full_name with 0 scans, not FK columns
DROP INDEX IF EXISTS public.idx_profiles_phone;
DROP INDEX IF EXISTS public.idx_profiles_city;
DROP INDEX IF EXISTS public.idx_profiles_full_name;

-- products: boolean columns have terrible selectivity
DROP INDEX IF EXISTS public.idx_products_active;
DROP INDEX IF EXISTS public.idx_products_featured;

-- order_anomalies: anomaly_type alone is low selectivity, 0 scans
DROP INDEX IF EXISTS public.idx_order_anomalies_type;

-- order_anomalies: severity partial index, 0 scans (unresolved index covers this)
DROP INDEX IF EXISTS public.idx_order_anomalies_severity;

-- order_status_history: new_status alone, 0 scans
DROP INDEX IF EXISTS public.idx_order_status_history_new_status;

-- product_analytics: single-column indexes replaced by composite below
DROP INDEX IF EXISTS public.idx_analytics_event_type;
DROP INDEX IF EXISTS public.idx_analytics_created_at;

-- support_tickets_error_reports: low-selectivity filter columns, 0 scans
DROP INDEX IF EXISTS public.idx_error_reports_status;
DROP INDEX IF EXISTS public.idx_error_reports_priority;
DROP INDEX IF EXISTS public.idx_error_reports_error_type;

-- security_events: single-column low-selectivity, 0 scans
DROP INDEX IF EXISTS public.idx_security_events_event_type;
DROP INDEX IF EXISTS public.idx_security_events_severity;

-- fraud_assessments: risk_level alone, 0 scans
DROP INDEX IF EXISTS public.idx_fraud_assessments_risk_level;

-- ============================================================================
-- PART 4: Composite indexes for better query patterns
-- ============================================================================

-- product_analytics: queries typically filter by product + event + time
CREATE INDEX IF NOT EXISTS idx_analytics_product_event_time
ON public.product_analytics USING btree (product_id, event_type, created_at DESC);

-- product_analytics: session-based rate limiting in RLS
CREATE INDEX IF NOT EXISTS idx_analytics_session_created
ON public.product_analytics USING btree (session_id, created_at)
WHERE session_id IS NOT NULL;

-- product_analytics: user-based rate limiting in RLS
CREATE INDEX IF NOT EXISTS idx_analytics_user_created
ON public.product_analytics USING btree (user_id, created_at)
WHERE user_id IS NOT NULL;

-- support_tickets: common admin query pattern (status + date)
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
ON public.support_tickets USING btree (status, created_at DESC);

-- support_tickets_error_reports: common admin filter pattern
CREATE INDEX IF NOT EXISTS idx_error_reports_status_priority_created
ON public.support_tickets_error_reports USING btree (status, priority, created_at DESC);

-- products: catalog browsing (active + slug lookup)
CREATE INDEX IF NOT EXISTS idx_products_active_slug
ON public.products USING btree (slug) WHERE is_active = true;

-- security_events: admin dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity_created
ON public.security_events USING btree (event_type, severity, created_at DESC);
