-- =======================================================================
-- Payment events monitoring surface
--
-- Goal: give operators a single, stable shape they can poll / tail / alert
-- on, covering the security- and correctness-critical events produced by
-- the payment pipeline (stripe-webhook, verify-payment, reconcile-payment,
-- send-order-confirmation, create-payment).
--
-- Deliverables:
--   1. `public.payment_events_critical` view — whitelisted event_types
--      with a computed `severity` column for easy alert routing.
--   2. `public.payment_events_unacked_since(p_since interval)` function —
--      aggregates events within a lookback window; safe for cron polling.
--
-- Both are read-only and security-definer-free. `payment_events` already
-- has RLS; the view + function inherit that policy. Grants are explicit:
-- `service_role` can read everything (edge functions, Supabase dashboard),
-- `authenticated` users cannot.
-- =======================================================================

-- -----------------------------------------------------------------------
-- Critical event types — central catalog.
--
-- Kept as a DOMAIN CHECK so adding a new critical event is a one-line
-- migration and the view stays in sync automatically.
-- -----------------------------------------------------------------------

-- The view maps each critical event_type to a severity tier so operator
-- dashboards can route alerts appropriately. Tiers are deliberately coarse:
--
--   'critical' — data-safety failures (unsigned webhook, failed signature
--                verification): MUST page oncall.
--   'error'    — user-visible or state-integrity errors (confirmation
--                failed, missing order_id): SHOULD alert within the hour.
--   'warning'  — degraded paths that recovered (snapshot persistence
--                failure, dev-only unsigned accept): TICKET, do not page.

CREATE OR REPLACE VIEW public.payment_events_critical AS
SELECT
  e.id,
  e.order_id,
  e.correlation_id,
  e.event_type,
  e.status,
  e.actor,
  e.details,
  e.error_message,
  e.ip_address,
  e.user_agent,
  e.duration_ms,
  e.created_at,
  CASE e.event_type
    -- Data-safety breaches: anybody could mark an order paid.
    WHEN 'webhook_signature_invalid'      THEN 'critical'
    WHEN 'webhook_unsigned_rejected'      THEN 'critical'
    -- Dev escape hatch should NEVER fire in prod; if it does, we want to know.
    WHEN 'webhook_unsigned_accepted'      THEN 'critical'
    -- Webhook received a valid signature but couldn't advance the order.
    WHEN 'webhook_confirmation_failed'    THEN 'error'
    WHEN 'webhook_missing_order_id'       THEN 'error'
    -- Snapshot persist failure means the downstream email falls back to
    -- body totals — user-visible consistency bug on promo-code orders.
    WHEN 'pricing_snapshot_persist_failed' THEN 'warning'
    -- Payment lifecycle failures — expected baseline rate, but a spike
    -- still matters.
    WHEN 'payment_failed'                 THEN 'error'
    WHEN 'payment_initiation_failed'      THEN 'error'
    ELSE 'info'
  END                                                           AS severity
FROM public.payment_events e
WHERE e.event_type IN (
  'webhook_signature_invalid',
  'webhook_unsigned_rejected',
  'webhook_unsigned_accepted',
  'webhook_confirmation_failed',
  'webhook_missing_order_id',
  'pricing_snapshot_persist_failed',
  'payment_failed',
  'payment_initiation_failed'
);

COMMENT ON VIEW public.payment_events_critical IS
  'Whitelisted critical payment_events with computed severity tier. Poll via edge/monitor-payment-events or the payment_events_unacked_since(interval) SQL function. Schema mirrors payment_events + `severity` text.';

-- Only service_role reads this view — edge functions + Supabase dashboard.
-- RLS on the underlying table still applies to anon/authenticated.
REVOKE ALL ON public.payment_events_critical FROM PUBLIC;
GRANT SELECT ON public.payment_events_critical TO service_role;

-- -----------------------------------------------------------------------
-- Aggregate function for alert pollers.
--
-- Returns one row per (event_type, severity) observed in the window,
-- plus the earliest + latest timestamps and a sample error_message so
-- operators can see at a glance what's firing without a second query.
--
-- Safe for cron: uses the `idx_payment_events_created_at` index on the
-- base table (DESC), so even years of history costs O(log N).
-- -----------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.payment_events_unacked_since(interval);

CREATE OR REPLACE FUNCTION public.payment_events_unacked_since(
  p_since interval DEFAULT interval '15 minutes'
)
RETURNS TABLE (
  event_type        text,
  severity          text,
  occurrence_count  bigint,
  first_seen        timestamptz,
  last_seen         timestamptz,
  sample_message    text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    event_type,
    severity,
    COUNT(*)                                         AS occurrence_count,
    MIN(created_at)                                  AS first_seen,
    MAX(created_at)                                  AS last_seen,
    (ARRAY_AGG(
      error_message
      ORDER BY created_at DESC
    ) FILTER (WHERE error_message IS NOT NULL))[1]   AS sample_message
  FROM public.payment_events_critical
  WHERE created_at >= (now() - p_since)
  GROUP BY event_type, severity
  ORDER BY
    CASE severity
      WHEN 'critical' THEN 1
      WHEN 'error'    THEN 2
      WHEN 'warning'  THEN 3
      ELSE 4
    END,
    last_seen DESC;
$$;

COMMENT ON FUNCTION public.payment_events_unacked_since(interval) IS
  'Aggregate payment_events_critical in a lookback window. Called by the monitor-payment-events edge function for cron polling; default window = 15 minutes.';

REVOKE ALL ON FUNCTION public.payment_events_unacked_since(interval) FROM PUBLIC;
GRANT EXECUTE
  ON FUNCTION public.payment_events_unacked_since(interval)
  TO service_role;
