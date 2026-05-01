/**
 * Pure request handler for `monitor-payment-events`.
 *
 * =====================================================================
 * Purpose
 * =====================================================================
 *
 * Exposes the `payment_events_unacked_since(interval)` SQL function as
 * an authenticated JSON endpoint so external schedulers (Vercel Cron,
 * GitHub Actions, Datadog synthetic checks, PagerDuty webhook probes…)
 * can poll for open critical events without direct DB access.
 *
 * Response shape is stable and designed to be piped straight into an
 * alerting system:
 *
 * ```json
 * {
 *   "window_minutes": 15,
 *   "generated_at": "2026-04-25T12:00:00.000Z",
 *   "total_count": 3,
 *   "highest_severity": "critical",
 *   "events": [
 *     {
 *       "event_type": "webhook_unsigned_rejected",
 *       "severity": "critical",
 *       "occurrence_count": 2,
 *       "first_seen": "2026-04-25T11:58:12Z",
 *       "last_seen":  "2026-04-25T11:59:01Z",
 *       "sample_message": "Missing stripe-signature header"
 *     },
 *     ...
 *   ]
 * }
 * ```
 *
 * =====================================================================
 * Auth
 * =====================================================================
 *
 * Service-role bearer. Intentionally NOT exposed to the anon/authenticated
 * roles: the response contains error messages and ip_addresses that
 * operators should not broadcast publicly. `supabase.config.toml` ships
 * with `verify_jwt=true` for this function.
 *
 * Alternative auth surface: rotating `MONITOR_PAYMENT_EVENTS_TOKEN` env
 * variable for schedulers that can't hold a service-role key. When set,
 * either the service-role bearer OR an `x-monitor-token` header matching
 * the env value is accepted.
 *
 * =====================================================================
 * Query parameters
 * =====================================================================
 *
 * - `window_minutes` (optional, default 15, min 1, max 10080 = 1 week)
 *   — how far back to look.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const FN_NAME = 'monitor-payment-events' as const;

const DEFAULT_WINDOW_MINUTES = 15;
const MAX_WINDOW_MINUTES = 10_080; // 7 days

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-monitor-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ---------------------------------------------------------------------------
// Row shapes — mirror the Postgres function signature exactly.
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'error' | 'warning' | 'info';

export interface PaymentEventAggregate {
  event_type: string;
  severity: Severity;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  sample_message: string | null;
}

export interface MonitorResponse {
  window_minutes: number;
  generated_at: string;
  total_count: number;
  highest_severity: Severity;
  events: PaymentEventAggregate[];
}

// ---------------------------------------------------------------------------
// Structured logging (matches get-order-by-token + order-confirmation-lookup).
// ---------------------------------------------------------------------------

type LogLevel = 'log' | 'warn' | 'error';

interface LogFields {
  step: string;
  reason?: string;
  [extra: string]: unknown;
}

function emit(level: LogLevel, fields: LogFields): void {
  const payload = JSON.stringify({ fn: FN_NAME, ...fields });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

function json(
  body: unknown,
  status: number = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(extraHeaders ?? {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Dependency injection — same pattern as order-confirmation-lookup.
// ---------------------------------------------------------------------------

export interface HandlerDeps {
  admin: SupabaseClient;
  /** Service-role key value (bearer compared as a constant-time string). */
  serviceRoleKey: string;
  /**
   * Optional rotating token for schedulers that can't hold the service key.
   * When unset, only the service-role bearer is accepted.
   */
  monitorToken?: string;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function timingSafeEqual(a: string, b: string): boolean {
  // Not a cryptographic compare but good enough at this layer: we're
  // protecting a read-only aggregate surface, not decrypting secrets.
  // Both inputs are the same length first — accept-list check.
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function checkAuthorized(req: Request, deps: HandlerDeps): boolean {
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ')
    ? authHeader.substring('Bearer '.length).trim()
    : '';
  if (bearer && timingSafeEqual(bearer, deps.serviceRoleKey)) return true;

  const monitorToken = req.headers.get('x-monitor-token') ?? '';
  if (
    deps.monitorToken &&
    monitorToken &&
    timingSafeEqual(monitorToken, deps.monitorToken)
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Window parsing
// ---------------------------------------------------------------------------

export function parseWindowMinutes(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_WINDOW_MINUTES;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_WINDOW_MINUTES;
  const clamped = Math.min(MAX_WINDOW_MINUTES, Math.max(1, Math.floor(n)));
  return clamped;
}

// ---------------------------------------------------------------------------
// Severity ranking (for `highest_severity`)
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 3,
  error: 2,
  warning: 1,
  info: 0,
};

export function highestSeverity(rows: PaymentEventAggregate[]): Severity {
  let best: Severity = 'info';
  for (const r of rows) {
    if (SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[best]) best = r.severity;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleRequest(
  req: Request,
  deps: HandlerDeps
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!checkAuthorized(req, deps)) {
    emit('warn', { step: 'auth', reason: 'unauthorized' });
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(req.url);
  const windowMinutes = parseWindowMinutes(
    url.searchParams.get('window_minutes')
  );

  try {
    const { data, error } = await deps.admin.rpc(
      'payment_events_unacked_since',
      {
        p_since: `${windowMinutes} minutes`,
      }
    );

    if (error) {
      emit('error', {
        step: 'db_rpc',
        reason: error.message,
        pg_code: (error as { code?: string }).code,
      });
      return json({ error: 'Database error' }, 500);
    }

    // Normalize the RPC row shape — Postgres bigint arrives as string
    // through the Supabase JS client.
    const rows = Array.isArray(data)
      ? (data as Array<Record<string, unknown>>)
      : [];
    const events: PaymentEventAggregate[] = rows.map((row) => ({
      event_type: String(row.event_type ?? ''),
      severity: (row.severity ?? 'info') as Severity,
      occurrence_count: Number(row.occurrence_count ?? 0),
      first_seen: String(row.first_seen ?? ''),
      last_seen: String(row.last_seen ?? ''),
      sample_message:
        typeof row.sample_message === 'string' ? row.sample_message : null,
    }));

    const body: MonitorResponse = {
      window_minutes: windowMinutes,
      generated_at: new Date().toISOString(),
      total_count: events.reduce((sum, e) => sum + e.occurrence_count, 0),
      highest_severity: highestSeverity(events),
      events,
    };

    emit('log', {
      step: 'respond_ok',
      window_minutes: windowMinutes,
      event_row_count: events.length,
      total_occurrences: body.total_count,
      highest_severity: body.highest_severity,
    });

    return json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit('error', { step: 'unexpected', reason: message });
    return json({ error: 'Internal server error' }, 500);
  }
}
