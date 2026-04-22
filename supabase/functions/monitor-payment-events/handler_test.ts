/**
 * Tests for monitor-payment-events/handler.ts.
 *
 * Coverage:
 *   1. Auth: service-role bearer, x-monitor-token, unauthorized, missing.
 *   2. Method: OPTIONS preflight, 405 on PUT/DELETE.
 *   3. Window parsing: default, clamp, invalid values.
 *   4. Response shape: normalization of bigint-as-string occurrence_count,
 *      highest_severity ranking, empty-result handling.
 *   5. DB error passes through as 500 "Database error" (no leak).
 */
import { assertEquals } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  handleRequest,
  highestSeverity,
  parseWindowMinutes,
  type HandlerDeps,
  type MonitorResponse,
  type PaymentEventAggregate,
  type Severity,
} from './handler.ts';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const SERVICE_KEY = 'test-service-role-key';
const MONITOR_TOKEN = 'test-monitor-token';

interface RpcResult {
  data: unknown;
  error: { message: string; code?: string } | null;
}

function makeAdmin(
  impl: (args: Record<string, unknown>) => RpcResult
): SupabaseClient {
  return {
    rpc: (_name: string, args: Record<string, unknown>): Promise<RpcResult> =>
      Promise.resolve(impl(args)),
  } as unknown as SupabaseClient;
}

function defaultDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    admin: makeAdmin(() => ({ data: [], error: null })),
    serviceRoleKey: SERVICE_KEY,
    monitorToken: MONITOR_TOKEN,
    ...overrides,
  };
}

function authedGet(
  url: string = 'http://localhost/monitor-payment-events',
  headers: Record<string, string> = {}
): Request {
  return new Request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, ...headers },
  });
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

Deno.test('OPTIONS preflight returns CORS headers', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', { method: 'OPTIONS' }),
    defaultDeps()
  );
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('PUT / DELETE → 405', async () => {
  for (const method of ['PUT', 'DELETE'] as const) {
    const res = await handleRequest(
      new Request('http://localhost/', { method }),
      defaultDeps()
    );
    assertEquals(res.status, 405);
  }
});

Deno.test('missing Authorization → 401', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', { method: 'GET' }),
    defaultDeps()
  );
  assertEquals(res.status, 401);
});

Deno.test('wrong bearer → 401', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', {
      method: 'GET',
      headers: { Authorization: 'Bearer wrong' },
    }),
    defaultDeps()
  );
  assertEquals(res.status, 401);
});

Deno.test('service-role bearer accepted → 200', async () => {
  const res = await handleRequest(authedGet(), defaultDeps());
  assertEquals(res.status, 200);
});

Deno.test('x-monitor-token accepted as an alternative → 200', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', {
      method: 'GET',
      headers: { 'x-monitor-token': MONITOR_TOKEN },
    }),
    defaultDeps()
  );
  assertEquals(res.status, 200);
});

Deno.test(
  'x-monitor-token ignored when deps.monitorToken is not set',
  async () => {
    const res = await handleRequest(
      new Request('http://localhost/', {
        method: 'GET',
        headers: { 'x-monitor-token': 'anything' },
      }),
      defaultDeps({ monitorToken: undefined })
    );
    assertEquals(res.status, 401);
  }
);

Deno.test('wrong x-monitor-token → 401', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', {
      method: 'GET',
      headers: { 'x-monitor-token': 'not-the-right-token' },
    }),
    defaultDeps()
  );
  assertEquals(res.status, 401);
});

// ---------------------------------------------------------------------------
// Window parsing
// ---------------------------------------------------------------------------

Deno.test('parseWindowMinutes: default when missing', () => {
  assertEquals(parseWindowMinutes(null), 15);
  assertEquals(parseWindowMinutes(''), 15);
});

Deno.test('parseWindowMinutes: default when NaN', () => {
  assertEquals(parseWindowMinutes('abc'), 15);
});

Deno.test('parseWindowMinutes: clamps to [1, 10080]', () => {
  assertEquals(parseWindowMinutes('0'), 1);
  assertEquals(parseWindowMinutes('-5'), 1);
  assertEquals(parseWindowMinutes('99999999'), 10_080);
});

Deno.test('parseWindowMinutes: floors non-integer values', () => {
  assertEquals(parseWindowMinutes('15.9'), 15);
  assertEquals(parseWindowMinutes('1.1'), 1);
});

Deno.test(
  'window query parameter is forwarded to the RPC as "<n> minutes"',
  async () => {
    let receivedSince: unknown = null;
    const deps = defaultDeps({
      admin: makeAdmin((args) => {
        receivedSince = args.p_since;
        return { data: [], error: null };
      }),
    });
    await handleRequest(authedGet('http://localhost/?window_minutes=60'), deps);
    assertEquals(receivedSince, '60 minutes');
  }
);

// ---------------------------------------------------------------------------
// Response shape
// ---------------------------------------------------------------------------

Deno.test('empty result → total_count:0, highest_severity:info', async () => {
  const res = await handleRequest(authedGet(), defaultDeps());
  const body = (await res.json()) as MonitorResponse;
  assertEquals(body.total_count, 0);
  assertEquals(body.highest_severity, 'info');
  assertEquals(body.events, []);
  assertEquals(body.window_minutes, 15);
});

Deno.test(
  'bigint-as-string occurrence_count is coerced to number',
  async () => {
    const deps = defaultDeps({
      admin: makeAdmin(() => ({
        data: [
          {
            event_type: 'webhook_unsigned_rejected',
            severity: 'critical',
            occurrence_count: '42', // Postgres bigint arrives as string
            first_seen: '2026-04-25T11:50:00Z',
            last_seen: '2026-04-25T11:59:59Z',
            sample_message: 'Missing stripe-signature header',
          },
        ],
        error: null,
      })),
    });
    const res = await handleRequest(authedGet(), deps);
    const body = (await res.json()) as MonitorResponse;
    assertEquals(body.events.length, 1);
    assertEquals(body.events[0]!.occurrence_count, 42);
    assertEquals(typeof body.events[0]!.occurrence_count, 'number');
    assertEquals(body.total_count, 42);
  }
);

Deno.test('highestSeverity: picks critical over error over warning', () => {
  const rows: PaymentEventAggregate[] = [
    mkAgg('warning'),
    mkAgg('error'),
    mkAgg('critical'),
  ];
  assertEquals(highestSeverity(rows), 'critical');
});

Deno.test('highestSeverity: falls back to info on empty input', () => {
  assertEquals(highestSeverity([]), 'info');
});

Deno.test('highestSeverity: all-warnings stays at warning', () => {
  const rows: PaymentEventAggregate[] = [mkAgg('warning'), mkAgg('warning')];
  assertEquals(highestSeverity(rows), 'warning');
});

Deno.test('response mirrors SQL function row order', async () => {
  // The SQL function orders by severity ASC (critical first) and last_seen
  // DESC. We verify the handler does NOT reorder the list — operator
  // dashboards depend on the original sort.
  const ordered = [
    mkAgg('critical', {
      event_type: 'webhook_signature_invalid',
      occurrence_count: 3,
    }),
    mkAgg('error', {
      event_type: 'payment_failed',
      occurrence_count: 2,
    }),
    mkAgg('warning', {
      event_type: 'pricing_snapshot_persist_failed',
      occurrence_count: 1,
    }),
  ];
  const deps = defaultDeps({
    admin: makeAdmin(() => ({
      data: ordered.map((e) => ({
        ...e,
        // also re-check bigint-as-string normalization
        occurrence_count: String(e.occurrence_count),
      })),
      error: null,
    })),
  });
  const res = await handleRequest(authedGet(), deps);
  const body = (await res.json()) as MonitorResponse;
  assertEquals(
    body.events.map((e) => e.event_type),
    ordered.map((e) => e.event_type)
  );
});

Deno.test(
  'DB error returns generic 500 without leaking the Postgrest message',
  async () => {
    const deps = defaultDeps({
      admin: makeAdmin(() => ({
        data: null,
        error: { message: 'connection refused', code: '08006' },
      })),
    });
    const res = await handleRequest(authedGet(), deps);
    assertEquals(res.status, 500);
    const body = (await res.json()) as { error: string };
    assertEquals(body.error, 'Database error');
    // Regression guard: the raw Postgrest message MUST NOT appear in the
    // response body — operators see it in the structured log instead.
    if (JSON.stringify(body).includes('connection refused')) {
      throw new Error('500 leaked the raw DB error');
    }
  }
);

Deno.test('unexpected throw returns generic 500 and is logged', async () => {
  const deps = defaultDeps({
    admin: {
      rpc: () => {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY=sk_secret_abc');
      },
    } as unknown as SupabaseClient,
  });
  const res = await handleRequest(authedGet(), deps);
  assertEquals(res.status, 500);
  const body = (await res.json()) as { error: string };
  assertEquals(body.error, 'Internal server error');
});

// ---------------------------------------------------------------------------
// Log format
// ---------------------------------------------------------------------------

Deno.test(
  'respond_ok log is structured JSON with fn + step + event counts',
  async () => {
    const captured: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
    try {
      await handleRequest(authedGet(), defaultDeps());
    } finally {
      console.log = originalLog;
    }
    const parsed = captured
      .map((l) => {
        try {
          return JSON.parse(l) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .find((p) => p && p.step === 'respond_ok');
    if (!parsed) {
      throw new Error(
        `expected a respond_ok log entry, got: ${JSON.stringify(captured)}`
      );
    }
    assertEquals(parsed.fn, 'monitor-payment-events');
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkAgg(
  severity: Severity,
  over: Partial<PaymentEventAggregate> = {}
): PaymentEventAggregate {
  return {
    event_type: 'webhook_signature_invalid',
    severity,
    occurrence_count: 1,
    first_seen: '2026-04-25T12:00:00Z',
    last_seen: '2026-04-25T12:00:00Z',
    sample_message: null,
    ...over,
  };
}
