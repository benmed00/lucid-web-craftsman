/**
 * Tests for order-confirmation-lookup/handler.ts.
 *
 * Layers covered:
 *   1. Token verify (parseAndVerifyToken) — signature, TTL, malformed shape.
 *   2. HTTP handler (handleRequest) — status codes, rate limit, email
 *      cross-check, configuration failure mode.
 *
 * A fake Supabase client (`makeAdmin`) and an isolated in-memory rate-limit
 * store (`createMemoryRateLimitStore`) keep these tests hermetic — no
 * network, no env, no module-level shared state.
 */

import { assertEquals } from '@std/assert';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import {
  buildOrderReference,
  handleRequest,
  parseAndVerifyToken,
  resolveDisplayTotalEuros,
  type HandlerDeps,
} from './handler.ts';
import { createMemoryRateLimitStore } from '../_shared/rate-limit/rate-limit.ts';

// ---------------------------------------------------------------------------
// Fixtures + helpers
// ---------------------------------------------------------------------------

const SECRET = 'test-order-confirmation-secret';
const ORDER_ID = '11111111-2222-4333-8444-555555555555';
const ORDER_EMAIL = 'alice@example.com';

/** Build a valid token whose contents match FAKE_ORDER below. */
async function signToken(
  overrides: Partial<{
    oid: string;
    em: string;
    /** ms-since-epoch expiry */
    exp: number;
    ref: string;
  }> = {}
): Promise<string> {
  const payload = {
    oid: overrides.oid ?? ORDER_ID,
    em: overrides.em ?? ORDER_EMAIL,
    exp: overrides.exp ?? Date.now() + 60 * 60_000, // +1h
    ref: overrides.ref,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = btoa(payloadJson)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  );
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  const sigB64 = btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${payloadB64}.${sigB64}`;
}

interface QueryResult {
  data: unknown;
  error: PostgrestError | null;
}

/**
 * Minimal fake Supabase client. Covers:
 *   admin.from(t).select(c).eq(k, v).maybeSingle() — for `orders`
 *   admin.from(t).select(c).eq(k, v)               — for `order_items`
 */
function makeAdmin(
  opts: { order?: QueryResult; items?: QueryResult } = {}
): SupabaseClient {
  const orderResult: QueryResult = opts.order ?? { data: null, error: null };
  const itemsResult: QueryResult = opts.items ?? { data: [], error: null };

  const orderBuilder = {
    select: () => orderBuilder,
    eq: () => orderBuilder,
    maybeSingle: () => Promise.resolve(orderResult),
  };
  // order_items builder — no `.maybeSingle`, terminal is the `.eq` chain.
  // Supabase JS resolves the chain with `then` — we implement thenable.
  const itemsBuilder = {
    select: () => itemsBuilder,
    eq: () => Promise.resolve(itemsResult),
  };

  return {
    from: (table: string): unknown =>
      table === 'orders' ? orderBuilder : itemsBuilder,
  } as unknown as SupabaseClient;
}

const FAKE_ORDER = {
  id: ORDER_ID,
  status: 'paid',
  order_status: 'processing',
  amount: 4999,
  total_amount: 4999,
  currency: 'EUR',
  created_at: '2026-01-01T00:00:00Z',
  shipping_address: {
    first_name: 'Alice',
    last_name: 'X',
    email: ORDER_EMAIL,
  },
  metadata: { customer_email: ORDER_EMAIL },
};

function makePostReq(body: unknown): Request {
  return new Request('http://localhost/order-confirmation-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function freshDeps(overrides: Partial<HandlerDeps> = {}): HandlerDeps {
  return {
    admin: makeAdmin({ order: { data: FAKE_ORDER, error: null } }),
    rateLimitStore: createMemoryRateLimitStore(),
    tokenSecret: SECRET,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Layer 1 — parseAndVerifyToken
// ---------------------------------------------------------------------------

Deno.test('parseAndVerifyToken: round-trip valid token', async () => {
  const token = await signToken();
  const parsed = await parseAndVerifyToken(token, SECRET);
  if (!parsed) throw new Error('expected parsed token');
  assertEquals(parsed.oid, ORDER_ID);
  assertEquals(parsed.em, ORDER_EMAIL);
  // Default ref is derived from oid when omitted.
  assertEquals(parsed.ref, buildOrderReference(ORDER_ID));
});

Deno.test('parseAndVerifyToken: returns null for bad signature', async () => {
  const token = await signToken();
  const [payloadB64] = token.split('.');
  const tampered = `${payloadB64}.AAAA`;
  assertEquals(await parseAndVerifyToken(tampered, SECRET), null);
});

Deno.test('parseAndVerifyToken: returns null for wrong secret', async () => {
  const token = await signToken();
  assertEquals(await parseAndVerifyToken(token, 'different-secret'), null);
});

Deno.test('parseAndVerifyToken: returns null for expired token', async () => {
  const token = await signToken({ exp: Date.now() - 1000 });
  assertEquals(await parseAndVerifyToken(token, SECRET), null);
});

Deno.test('parseAndVerifyToken: returns null for malformed shape', async () => {
  assertEquals(await parseAndVerifyToken('not-a-token', SECRET), null);
  assertEquals(await parseAndVerifyToken('a.b.c', SECRET), null);
  assertEquals(await parseAndVerifyToken('', SECRET), null);
});

// ---------------------------------------------------------------------------
// Layer 2 — handleRequest
// ---------------------------------------------------------------------------

Deno.test('handleRequest: OPTIONS preflight returns CORS headers', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', { method: 'OPTIONS' }),
    freshDeps()
  );
  assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handleRequest: non-POST returns 405', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', { method: 'GET' }),
    freshDeps()
  );
  assertEquals(res.status, 405);
});

Deno.test(
  'handleRequest: missing ORDER_CONFIRMATION_TOKEN_SECRET returns 503',
  async () => {
    const res = await handleRequest(
      makePostReq({ token: 'anything' }),
      freshDeps({ tokenSecret: '' })
    );
    assertEquals(res.status, 503);
    const body = (await res.json()) as { found: boolean; error: string };
    assertEquals(body.found, false);
  }
);

Deno.test('handleRequest: invalid JSON body → 400', async () => {
  const res = await handleRequest(
    new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{',
    }),
    freshDeps()
  );
  assertEquals(res.status, 400);
  const body = (await res.json()) as { found: boolean; error: string };
  assertEquals(body.error, 'Invalid JSON body');
});

Deno.test('handleRequest: missing token field → 400', async () => {
  const res = await handleRequest(makePostReq({}), freshDeps());
  assertEquals(res.status, 400);
});

Deno.test('handleRequest: non-string token → 400', async () => {
  const res = await handleRequest(makePostReq({ token: 42 }), freshDeps());
  assertEquals(res.status, 400);
});

Deno.test('handleRequest: invalid/expired token → 403', async () => {
  const res = await handleRequest(
    makePostReq({ token: 'bogus-payload.bogus-sig' }),
    freshDeps()
  );
  assertEquals(res.status, 403);
  const body = (await res.json()) as { error: string };
  assertEquals(body.error, 'Invalid or expired token');
});

Deno.test('handleRequest: happy path returns order + items', async () => {
  const token = await signToken();
  const res = await handleRequest(makePostReq({ token }), freshDeps());
  assertEquals(res.status, 200);
  const body = (await res.json()) as {
    found: boolean;
    order_id: string;
    order_reference: string;
    is_paid: boolean;
  };
  assertEquals(body.found, true);
  assertEquals(body.order_id, ORDER_ID);
  assertEquals(body.order_reference, buildOrderReference(ORDER_ID));
  assertEquals(body.is_paid, true);
});

Deno.test(
  'handleRequest: email mismatch between token and order → {found: false}',
  async () => {
    const token = await signToken({ em: 'someone-else@example.com' });
    const res = await handleRequest(makePostReq({ token }), freshDeps());
    assertEquals(res.status, 200);
    const body = (await res.json()) as { found: boolean };
    assertEquals(body.found, false);
  }
);

Deno.test(
  'handleRequest: requested reference not matching token ref → 403',
  async () => {
    const token = await signToken();
    const res = await handleRequest(
      makePostReq({ token, order_reference: 'CMD-WRONG-REFERENCE' }),
      freshDeps()
    );
    assertEquals(res.status, 403);
    const body = (await res.json()) as { error: string };
    assertEquals(body.error, 'Reference mismatch');
  }
);

Deno.test('handleRequest: order not found → {found: false}', async () => {
  const token = await signToken();
  const res = await handleRequest(
    makePostReq({ token }),
    freshDeps({
      admin: makeAdmin({ order: { data: null, error: null } }),
    })
  );
  assertEquals(res.status, 200);
  const body = (await res.json()) as { found: boolean };
  assertEquals(body.found, false);
});

// ---------------------------------------------------------------------------
// Rate-limit tests — the primary deliverable of this batch
// ---------------------------------------------------------------------------

Deno.test(
  'handleRequest: rate-limits after 20 requests, returns 429 + Retry-After',
  async () => {
    const token = await signToken();
    const deps = freshDeps(); // isolated memory store
    for (let i = 1; i <= 20; i++) {
      const res = await handleRequest(makePostReq({ token }), deps);
      if (res.status !== 200) {
        throw new Error(`request ${i} expected 200, got ${res.status}`);
      }
      await res.body?.cancel();
    }
    const limited = await handleRequest(makePostReq({ token }), deps);
    assertEquals(limited.status, 429);
    const body = (await limited.json()) as { error: string };
    assertEquals(body.error, 'Too many requests');
    const retryAfter = limited.headers.get('Retry-After');
    if (!retryAfter || Number(retryAfter) <= 0) {
      throw new Error(`expected Retry-After > 0, got "${retryAfter}"`);
    }
  }
);

Deno.test(
  'handleRequest: invalid tokens do NOT consume the rate-limit budget',
  async () => {
    const deps = freshDeps(); // isolated memory store

    // Hammer with bogus tokens — all should 403, none should count.
    for (let i = 0; i < 50; i++) {
      const res = await handleRequest(
        makePostReq({ token: `bogus-${i}.fake` }),
        deps
      );
      assertEquals(res.status, 403);
      await res.body?.cancel();
    }

    // A valid token should still succeed — budget is untouched.
    const goodToken = await signToken();
    const ok = await handleRequest(makePostReq({ token: goodToken }), deps);
    assertEquals(ok.status, 200);
  }
);

Deno.test(
  'handleRequest: rate-limit keyed per-oid (different orders have independent budgets)',
  async () => {
    const deps = freshDeps({
      admin: makeAdmin({
        order: { data: FAKE_ORDER, error: null },
      }),
    });
    const tokenA = await signToken({ oid: ORDER_ID });
    // Exhaust order A's budget.
    for (let i = 1; i <= 20; i++) {
      const res = await handleRequest(makePostReq({ token: tokenA }), deps);
      assertEquals(res.status, 200);
      await res.body?.cancel();
    }
    const exhaustedA = await handleRequest(
      makePostReq({ token: tokenA }),
      deps
    );
    assertEquals(exhaustedA.status, 429);
    await exhaustedA.body?.cancel();

    // A different oid should still be allowed, proving the identifier scope.
    const otherOrderId = '22222222-3333-4444-8555-666666666666';
    const depsOther = freshDeps({
      admin: makeAdmin({
        order: {
          data: { ...FAKE_ORDER, id: otherOrderId },
          error: null,
        },
      }),
      // Re-use the SAME in-memory store to prove the key is what separates them
      rateLimitStore: deps.rateLimitStore,
    });
    const tokenB = await signToken({ oid: otherOrderId });
    const okB = await handleRequest(makePostReq({ token: tokenB }), depsOther);
    assertEquals(okB.status, 200);
  }
);

// ---------------------------------------------------------------------------
// Log format — structured JSON so Supabase log search stays parseable.
// ---------------------------------------------------------------------------

Deno.test(
  'handleRequest: warn on invalid token is structured JSON with fn + step',
  async () => {
    const captured: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
    try {
      await handleRequest(
        makePostReq({ token: 'definitely-invalid' }),
        freshDeps()
      );
    } finally {
      console.warn = originalWarn;
    }
    if (captured.length === 0) {
      throw new Error('expected at least one console.warn call');
    }
    const parsed = JSON.parse(captured[0]!) as Record<string, unknown>;
    assertEquals(parsed.fn, 'order-confirmation-lookup');
    assertEquals(parsed.step, 'verify_token');
  }
);

// ---------------------------------------------------------------------------
// resolveDisplayTotalEuros — kept co-located for co-owned coverage.
// The five main cases are covered by resolve_display_total_test.ts;
// here we just spot-check that the re-export still works from handler.ts.
// ---------------------------------------------------------------------------

Deno.test('resolveDisplayTotalEuros re-export: snapshot wins', () => {
  assertEquals(resolveDisplayTotalEuros(149.95, 120, 15995), 159.95);
});
