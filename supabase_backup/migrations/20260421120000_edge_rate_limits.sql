-- =======================================================================
-- Edge-function rate-limit state, externalised from per-isolate memory.
--
-- Why: in-memory Map in `get-order-by-token/lib/rate-limit.ts` is scoped to
-- a single Deno isolate. It resets on cold start and cannot enforce a budget
-- across horizontally-scaled isolates. This table + RPC provide a shared,
-- atomic counter that survives cold starts.
--
-- Contract (see `supabase/functions/get-order-by-token/lib/rate-limit-postgres.ts`):
--   - Each call consumes one attempt for `identifier`.
--   - If the stored window has already ended, the counter is reset to 1 and a
--     new window is opened.
--   - Returns `allowed`, `remaining`, `reset_ms` (epoch millis).
--
-- Intentional design notes:
--   - Service-role only. No RLS policy is added, and RLS is enabled — every
--     anon/authenticated read is denied. The RPC is `SECURITY DEFINER` and
--     executes with the function owner's privileges.
--   - We do NOT delete expired rows per call; the table is tiny (key = text,
--     two small scalars), and cleanup is handled by pg_cron below.
-- =======================================================================

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  identifier     text        PRIMARY KEY,
  count          integer     NOT NULL,
  window_end     timestamptz NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limits_window_end
  ON public.edge_rate_limits (window_end);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- Intentionally no policy — service_role bypasses RLS, everyone else is denied.

COMMENT ON TABLE public.edge_rate_limits IS
  'Cross-isolate rate-limit state for Supabase Edge Functions. Managed via public.edge_rate_limit_consume(); do not UPDATE directly.';

-- =======================================================================
-- Atomic consume RPC
--
-- INSERT ... ON CONFLICT DO UPDATE is atomic within a single statement,
-- which eliminates the race where two concurrent requests each read-modify-
-- write and both succeed past the budget.
-- =======================================================================
CREATE OR REPLACE FUNCTION public.edge_rate_limit_consume(
  p_identifier    text,
  p_max_attempts  integer,
  p_window_ms     integer
)
RETURNS TABLE (
  allowed    boolean,
  remaining  integer,
  reset_ms   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now          timestamptz := now();
  v_window       interval;
  v_count        integer;
  v_window_end   timestamptz;
BEGIN
  IF p_max_attempts <= 0 OR p_window_ms <= 0 THEN
    RAISE EXCEPTION 'edge_rate_limit_consume: p_max_attempts and p_window_ms must be positive';
  END IF;

  v_window := make_interval(secs => p_window_ms / 1000.0);

  INSERT INTO public.edge_rate_limits AS r (identifier, count, window_end, updated_at)
  VALUES (p_identifier, 1, v_now + v_window, v_now)
  ON CONFLICT (identifier) DO UPDATE
    SET
      count = CASE
        WHEN r.window_end <= v_now THEN 1            -- window expired — reset
        ELSE r.count + 1
      END,
      window_end = CASE
        WHEN r.window_end <= v_now THEN v_now + v_window
        ELSE r.window_end
      END,
      updated_at = v_now
  RETURNING r.count, r.window_end
  INTO v_count, v_window_end;

  RETURN QUERY SELECT
    (v_count <= p_max_attempts)::boolean,
    GREATEST(0, p_max_attempts - v_count)::integer,
    (extract(epoch from v_window_end) * 1000)::bigint;
END;
$$;

COMMENT ON FUNCTION public.edge_rate_limit_consume(text, integer, integer) IS
  'Atomic rate-limit consume. See migration header and supabase/functions/get-order-by-token/lib/rate-limit-postgres.ts.';

-- Lock down execution to service_role only. Edge Functions use the service
-- role key; no other caller should touch this RPC.
REVOKE ALL ON FUNCTION public.edge_rate_limit_consume(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edge_rate_limit_consume(text, integer, integer) TO service_role;

-- =======================================================================
-- Periodic cleanup — drop rows whose window ended long ago. Runs daily.
-- If pg_cron isn't installed (local dev without the extension), skip.
-- =======================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'edge-rate-limits-cleanup',
      '17 3 * * *',
      $cmd$
        DELETE FROM public.edge_rate_limits
        WHERE window_end < now() - interval '1 day'
      $cmd$
    );
  END IF;
END $$;
