/**
 * Tests for get-order-by-token.
 *
 * Two layers:
 *   1. Token verification (`verifyTokenPayload`) — deterministic, no deps.
 *   2. HTTP handler (`handleRequest`) — exercised with a fake Supabase client
 *      so we can assert status codes and response bodies without a real DB.
 *
 * End-to-end DB integration is left to post-deploy curl / Cypress.
 */
import { assertEquals, assertRejects } from '@std/assert';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

// Env must be set BEFORE importing the token or handler modules, because
// they read `Deno.env` at import time.
Deno.env.set('INVOICE_SIGNING_SECRET', 'test-secret-for-unit-tests');

const { signOrderToken, signToken, verifyTokenPayload } = await import(
  '../_shared/invoice/token.ts'
);
const {
  handleRequest,
  ORDER_SELECT,
  ITEMS_SELECT,
  OrderRowSchema,
  OrderItemRowSchema,
  PUBLIC_ORDER_METADATA_KEYS,
  PUBLIC_SHIPPING_ADDRESS_KEYS,
  pickPublicOrderMetadata,
  pickPublicShippingAddress,
} = await import('./handler.ts');
const { __resetRateLimitStore } = await import(
  '../_shared/rate-limit/rate-limit.ts'
);

// ---------------------------------------------------------------------------
// Token layer (pre-existing coverage — kept as-is)
// ---------------------------------------------------------------------------

Deno.test('signOrderToken → verifyTokenPayload roundtrip', async () => {
    resetState();
  const token = await signOrderToken('order-123');
  const payload = await verifyTokenPayload(token);
  assertEquals(payload.order_id, 'order-123');
  assertEquals(payload.type, 'order_access');
  // 15-minute TTL
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now || payload.exp > now + 16 * 60) {
    throw new Error(`exp out of range: ${payload.exp}`);
  }
});

Deno.test('verifyTokenPayload rejects malformed token', async () => {
    resetState();
  await assertRejects(() => verifyTokenPayload('not-a-token'), Error);
  await assertRejects(() => verifyTokenPayload('a.b.c'), Error);
});

Deno.test('verifyTokenPayload rejects bad signature', async () => {
    resetState();
  const token = await signOrderToken('order-123');
  const [payloadB64] = token.split('.');
  const tampered = `${payloadB64}.AAAA`;
  await assertRejects(
    () => verifyTokenPayload(tampered),
    Error,
    'Invalid token signature'
  );
});

Deno.test('verifyTokenPayload rejects expired token', async () => {
    resetState();
  // Forge an expired token using the same secret.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode('test-secret-for-unit-tests'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const payload = { order_id: 'o', type: 'order_access', exp: 1 };
  const b64 = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = b64(JSON.stringify(payload));
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64))
  );
  let bin = '';
  for (const x of sig) bin += String.fromCharCode(x);
  const sigB64 = b64(bin);
  await assertRejects(
    () => verifyTokenPayload(`${payloadB64}.${sigB64}`),
    Error,
    'Token expired'
  );
});

Deno.test('signToken (invoice) yields invoice_access type', async () => {
    resetState();
  const token = await signToken('order-xyz');
  const payload = await verifyTokenPayload(token);
  assertEquals(payload.type, 'invoice_access');
  // 30-day-ish TTL
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now + 29 * 24 * 3600) {
    throw new Error(`invoice token TTL too short: ${payload.exp - now}`);
  }
});

// ---------------------------------------------------------------------------
// Handler layer — fake Supabase client
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error: PostgrestError | null };

/**
 * Minimal stand-in for the query chain used in handler.ts:
 *   admin.from(t).select(c).eq(k, v).maybeSingle<T>()
 *   admin.from(t).select(c).eq(k, v).returns<T[]>()
 * Both terminal methods resolve to the same shape, so one builder covers both.
 */
function makeAdmin(
  opts: {
    order?: QueryResult;
    items?: QueryResult;
    throwOnFrom?: Error;
  } = {}
): SupabaseClient {
  const orderResult: QueryResult = opts.order ?? { data: null, error: null };
  const itemsResult: QueryResult = opts.items ?? { data: [], error: null };

  const build = (result: QueryResult) => {
    // deno-lint-ignore no-explicit-any
    const b: any = {
      select: () => b,
      eq: () => b,
      maybeSingle: () => Promise.resolve(result),
      returns: () => Promise.resolve(result),
    };
    return b;
  };

  return {
    from: (table: string) => {
      if (opts.throwOnFrom) throw opts.throwOnFrom;
      return table === 'orders' ? build(orderResult) : build(itemsResult);
    },
  } as unknown as SupabaseClient;
}

function makePostReq(body: unknown): Request {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('http://localhost/get-order-by-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
}

const ORDER_ID = 'ord_00000000-0000-0000-0000-000000000001';

const FAKE_ORDER = {
  id: ORDER_ID,
  status: 'paid',
  order_status: 'processing',
  amount: 4999,
  currency: 'eur',
  created_at: '2026-01-01T00:00:00Z',
  shipping_address: { city: 'Paris' },
  metadata: {},
  payment_method: 'card',
  user_id: null,
  pricing_snapshot: null,
  subtotal_amount: 4999,
  discount_amount: 0,
  shipping_amount: 0,
  total_amount: 4999,
};

const FAKE_ITEM = {
  quantity: 2,
  unit_price: 2499,
  total_price: 4998,
  product_snapshot: { name: 'Thing' },
  // order_items.product_id is INTEGER in the DB migration — schema expects number.
  product_id: 42,
};

// Ensure every handler test starts with a clean rate-limit bucket; otherwise
// parallel Deno.test execution + a 20 req/min budget would make tests flaky.
function resetState(): void {
  __resetRateLimitStore();
}

// Scenario 4
Deno.test('handleRequest: invalid/tampered token → 401', async () => {
    resetState();
  const res = await handleRequest(makePostReq({ token: 'bogus' }), makeAdmin());
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'Invalid or expired token' });
});

// Scenario 5 — the security boundary we were most worried about
Deno.test('handleRequest: invoice_access token rejected → 401', async () => {
    resetState();
  const token = await signToken(ORDER_ID); // 30-day invoice_access token
  const res = await handleRequest(makePostReq({ token }), makeAdmin());
  assertEquals(res.status, 401);
  assertEquals(await res.json(), { error: 'Wrong token type' });
});

// Scenario 8
Deno.test('handleRequest: order not found → 404', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token }),
    makeAdmin({ order: { data: null, error: null } })
  );
  assertEquals(res.status, 404);
  assertEquals(await res.json(), { error: 'Order not found' });
});

// Scenario 9 — happy path
Deno.test('handleRequest: happy path returns order + items → 200', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token }),
    makeAdmin({
      order: { data: FAKE_ORDER, error: null },
      items: { data: [FAKE_ITEM, FAKE_ITEM], error: null },
    })
  );
  assertEquals(res.status, 200);
  const body = (await res.json()) as {
    order: typeof FAKE_ORDER;
    items: Array<typeof FAKE_ITEM>;
  };
  assertEquals(body.order.id, ORDER_ID);
  assertEquals(body.items.length, 2);
});

// Scenario 10 — null items normalized to []
Deno.test('handleRequest: null items normalized to empty array', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token }),
    makeAdmin({
      order: { data: FAKE_ORDER, error: null },
      items: { data: null, error: null },
    })
  );
  assertEquals(res.status, 200);
  const body = (await res.json()) as { items: unknown[] };
  assertEquals(body.items, []);
});

// Hardening: 400 for malformed JSON (previously collapsed into 500)
Deno.test('handleRequest: malformed JSON body → 400', async () => {
    resetState();
  const req = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-json{{',
  });
  const res = await handleRequest(req, makeAdmin());
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'Invalid JSON body' });
});

Deno.test('handleRequest: missing token field → 400', async () => {
    resetState();
  const res = await handleRequest(makePostReq({}), makeAdmin());
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'Missing token' });
});

Deno.test('handleRequest: non-string token → 400', async () => {
    resetState();
  const res = await handleRequest(makePostReq({ token: 123 }), makeAdmin());
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'Missing token' });
});

Deno.test('handleRequest: orders DB error → 500 "Database error"', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token }),
    makeAdmin({
      order: {
        data: null,
        error: {
          message: 'pg: connection refused',
          details: '',
          hint: '',
          code: '08006',
          name: 'PostgrestError',
        } as unknown as PostgrestError,
      },
    })
  );
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'Database error' });
});

Deno.test('handleRequest: items DB error → 500 "Database error"', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token }),
    makeAdmin({
      order: { data: FAKE_ORDER, error: null },
      items: {
        data: null,
        error: {
          message: 'pg: timeout',
          details: '',
          hint: '',
          code: '57014',
          name: 'PostgrestError',
        } as unknown as PostgrestError,
      },
    })
  );
  assertEquals(res.status, 500);
  assertEquals(await res.json(), { error: 'Database error' });
});

// Hardening: the 500 catch-all must NOT echo internal error messages.
Deno.test(
  'handleRequest: unexpected throw returns generic 500 (no leak)',
  async () => {
    resetState();
    const token = await signOrderToken(ORDER_ID);
    const secret = 'SUPABASE_SERVICE_ROLE_KEY=sk_secret_abcdef';
    const res = await handleRequest(
      makePostReq({ token }),
      makeAdmin({ throwOnFrom: new Error(secret) })
    );
    assertEquals(res.status, 500);
    const body = (await res.json()) as { error: string };
    assertEquals(body.error, 'Internal server error');
    // Belt-and-braces: make sure no part of the sensitive payload leaked.
    if (body.error.includes('sk_secret')) {
      throw new Error('500 response leaked internal error text');
    }
  }
);

Deno.test(
  'handleRequest: OPTIONS preflight → 204ish with CORS headers',
  async () => {
    resetState();
    const req = new Request('http://localhost/', { method: 'OPTIONS' });
    const res = await handleRequest(req, makeAdmin());
    // Response with null body → status defaults to 200; what matters is CORS.
    assertEquals(res.headers.get('Access-Control-Allow-Origin'), '*');
    assertEquals(
      res.headers.get('Access-Control-Allow-Methods'),
      'POST, OPTIONS'
    );
  }
);

// ---------------------------------------------------------------------------
// Tier 2 — schema validation, drift guard, PII whitelist
// ---------------------------------------------------------------------------

// Zod request-body schema hardening
Deno.test('handleRequest: empty-string token → 400', async () => {
    resetState();
  const res = await handleRequest(
    makePostReq({ token: '' }),
    makeAdmin()
  );
  assertEquals(res.status, 400);
  assertEquals(await res.json(), { error: 'Missing token' });
});

Deno.test('handleRequest: extra unknown fields on body are ignored', async () => {
    resetState();
  const token = await signOrderToken(ORDER_ID);
  const res = await handleRequest(
    makePostReq({ token, hacker: 'DROP TABLE orders' }),
    makeAdmin({
      order: { data: FAKE_ORDER, error: null },
      items: { data: [], error: null },
    })
  );
  // Extra fields must not break parsing — Zod's default is strip, not reject.
  assertEquals(res.status, 200);
});

// Drift guard: schema is the source of truth for the SELECT string
Deno.test('ORDER_SELECT is derived from OrderRowSchema (no drift)', () => {
  const expected = Object.keys(OrderRowSchema.shape).join(', ');
  assertEquals(ORDER_SELECT, expected);
  // Spot-check critical columns are present, so nobody can delete them silently.
  for (const required of [
    'id',
    'total_amount',
    'shipping_address',
    'pricing_snapshot',
  ]) {
    if (!ORDER_SELECT.includes(required)) {
      throw new Error(`ORDER_SELECT lost required column: ${required}`);
    }
  }
});

Deno.test('ITEMS_SELECT is derived from OrderItemRowSchema (no drift)', () => {
  const expected = Object.keys(OrderItemRowSchema.shape).join(', ');
  assertEquals(ITEMS_SELECT, expected);
  for (const required of ['quantity', 'unit_price', 'total_price']) {
    if (!ITEMS_SELECT.includes(required)) {
      throw new Error(`ITEMS_SELECT lost required column: ${required}`);
    }
  }
});

// The happy-path fixture must stay in sync with the schema. If someone adds
// a required column to OrderRowSchema without updating FAKE_ORDER, parse fails.
Deno.test('FAKE_ORDER fixture conforms to OrderRowSchema', () => {
  OrderRowSchema.parse(FAKE_ORDER);
});

Deno.test('FAKE_ITEM fixture conforms to OrderItemRowSchema', () => {
  OrderItemRowSchema.parse(FAKE_ITEM);
});

// Metadata PII whitelist — the core Tier 2 security change.
Deno.test('pickPublicOrderMetadata: drops everything not on the whitelist', () => {
  const raw = {
    client_ip: '203.0.113.42',
    stripe_session_id: 'cs_live_abcdef',
    correlation_id: 'corr-123',
    device_type: 'mobile',
    customer_email: 'alice@example.com',
    payment_method_label: 'Carte Visa',
  };
  const safe = pickPublicOrderMetadata(raw);
  assertEquals(safe, {
    customer_email: 'alice@example.com',
    payment_method_label: 'Carte Visa',
  });
});

Deno.test('pickPublicOrderMetadata: null input → null output', () => {
  assertEquals(pickPublicOrderMetadata(null), null);
  assertEquals(pickPublicOrderMetadata(undefined), null);
});

Deno.test('pickPublicOrderMetadata: empty whitelisted keys → null', () => {
  // If the row has metadata but none of our public keys match, we return null
  // rather than an empty object so the client can branch cleanly on truthiness.
  assertEquals(pickPublicOrderMetadata({ client_ip: '1.2.3.4' }), null);
});

Deno.test(
  'handleRequest: response strips client_ip / stripe_session_id from metadata',
  async () => {
    resetState();
    const token = await signOrderToken(ORDER_ID);
    const leaky = {
      ...FAKE_ORDER,
      metadata: {
        client_ip: '203.0.113.42',
        stripe_session_id: 'cs_live_abcdef',
        correlation_id: 'corr-123',
        customer_email: 'alice@example.com',
        payment_method_label: 'Carte Visa',
      },
    };
    const res = await handleRequest(
      makePostReq({ token }),
      makeAdmin({
        order: { data: leaky, error: null },
        items: { data: [], error: null },
      })
    );
    assertEquals(res.status, 200);
    const body = (await res.json()) as {
      order: { metadata: Record<string, unknown> | null };
    };
    // Only whitelisted keys survive — assert absence of the sensitive ones
    // explicitly so a future wildcard pass-through would fail this test.
    const keys = Object.keys(body.order.metadata ?? {});
    assertEquals(keys.sort(), [...PUBLIC_ORDER_METADATA_KEYS].sort());
    if (body.order.metadata && 'client_ip' in body.order.metadata) {
      throw new Error('PII leak: client_ip present in response');
    }
    if (
      body.order.metadata &&
      'stripe_session_id' in body.order.metadata
    ) {
      throw new Error('Internal id leak: stripe_session_id present');
    }
    // And the whitelisted fields DO make it through unchanged.
    assertEquals(body.order.metadata, {
      customer_email: 'alice@example.com',
      payment_method_label: 'Carte Visa',
    });
  }
);

// Regression guard: serialized response body must not contain the PII needle,
// irrespective of shape. Catches accidental re-introduction anywhere in the
// JSON (not just `order.metadata`).
Deno.test(
  'handleRequest: serialized response never contains client_ip from metadata',
  async () => {
    resetState();
    const token = await signOrderToken(ORDER_ID);
    const needle = '203.0.113.42';
    const leaky = {
      ...FAKE_ORDER,
      metadata: { client_ip: needle, customer_email: 'a@b.c' },
    };
    const res = await handleRequest(
      makePostReq({ token }),
      makeAdmin({
        order: { data: leaky, error: null },
        items: { data: [], error: null },
      })
    );
    const text = await res.text();
    if (text.includes(needle)) {
      throw new Error(`client_ip "${needle}" leaked into response: ${text}`);
    }
  }
);

// ---------------------------------------------------------------------------
// Tier 3 — shipping-address whitelist, rate limit, product_id schema fix
// ---------------------------------------------------------------------------

// shipping_address pick function
Deno.test('pickPublicShippingAddress: drops non-whitelisted keys', () => {
  const raw = {
    first_name: 'Alice',
    last_name: 'X',
    email: 'a@b.c',
    address_line1: '1 rue',
    address_line2: 'apt 2',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
    phone: '+33123456789',
  };
  const safe = pickPublicShippingAddress(raw);
  assertEquals(safe, {
    first_name: 'Alice',
    last_name: 'X',
    email: 'a@b.c',
    address_line1: '1 rue',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
  });
});

Deno.test('pickPublicShippingAddress: null in → null out', () => {
  assertEquals(pickPublicShippingAddress(null), null);
  assertEquals(pickPublicShippingAddress(undefined), null);
});

// Handler: shipping_address is pruned at the response boundary.
Deno.test(
  'handleRequest: response prunes phone / address_line2 from shipping_address',
  async () => {
    resetState();
    const token = await signOrderToken(ORDER_ID);
    const orderWithFullAddress = {
      ...FAKE_ORDER,
      shipping_address: {
        first_name: 'Alice',
        last_name: 'X',
        email: 'a@b.c',
        address_line1: '1 rue',
        address_line2: 'apt 2',
        postal_code: '75001',
        city: 'Paris',
        country: 'FR',
        phone: '+33123456789',
      },
    };
    const res = await handleRequest(
      makePostReq({ token }),
      makeAdmin({
        order: { data: orderWithFullAddress, error: null },
        items: { data: [], error: null },
      })
    );
    assertEquals(res.status, 200);
    const body = (await res.json()) as {
      order: { shipping_address: Record<string, unknown> | null };
    };
    const keys = Object.keys(body.order.shipping_address ?? {});
    assertEquals(keys.sort(), [...PUBLIC_SHIPPING_ADDRESS_KEYS].sort());
    if (
      body.order.shipping_address &&
      'phone' in body.order.shipping_address
    ) {
      throw new Error('phone leaked through shipping_address whitelist');
    }
    if (
      body.order.shipping_address &&
      'address_line2' in body.order.shipping_address
    ) {
      throw new Error('address_line2 leaked through shipping_address whitelist');
    }
  }
);

// product_id type drift fix — schema now requires number, not string.
Deno.test(
  'OrderItemRowSchema: product_id must be a number (DB is INTEGER)',
  () => {
    // Good: numeric product_id parses.
    OrderItemRowSchema.parse({
      quantity: 1,
      unit_price: 100,
      total_price: 100,
      product_snapshot: null,
      product_id: 42,
    });
    // Good: null is allowed (ON DELETE RESTRICT but column is nullable in practice).
    OrderItemRowSchema.parse({
      quantity: 1,
      unit_price: 100,
      total_price: 100,
      product_snapshot: null,
      product_id: null,
    });
    // Bad: string should fail (the old, wrong shape we were propagating).
    let threw = false;
    try {
      OrderItemRowSchema.parse({
        quantity: 1,
        unit_price: 100,
        total_price: 100,
        product_snapshot: null,
        product_id: 'prod_abc',
      });
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(
        'OrderItemRowSchema accepted a string product_id — drift guard failed'
      );
    }
  }
);

// Rate limit — 20 per minute per order_id, then 429 with Retry-After.
Deno.test(
  'handleRequest: rate-limits by order_id after 20 requests, returns 429 + Retry-After',
  async () => {
    resetState();
    // Use a distinct order_id so this test can exhaust its own budget
    // without being affected by or affecting other tests.
    const rateLimitOrderId = 'ord_ratelimit-test-00000000000000000001';
    const token = await signOrderToken(rateLimitOrderId);
    const admin = makeAdmin({
      order: { data: { ...FAKE_ORDER, id: rateLimitOrderId }, error: null },
      items: { data: [], error: null },
    });

    // First 20 requests succeed
    for (let i = 1; i <= 20; i++) {
      const res = await handleRequest(makePostReq({ token }), admin);
      if (res.status !== 200) {
        throw new Error(`request ${i} expected 200, got ${res.status}`);
      }
      await res.body?.cancel(); // free up the response
    }

    // 21st request is rate-limited
    const limited = await handleRequest(makePostReq({ token }), admin);
    assertEquals(limited.status, 429);
    assertEquals(await limited.json(), { error: 'Too many requests' });
    const retryAfter = limited.headers.get('Retry-After');
    if (!retryAfter || Number(retryAfter) <= 0) {
      throw new Error(`expected Retry-After > 0, got "${retryAfter}"`);
    }
  }
);

// Rate limit runs AFTER token verify, so bad tokens don't exhaust the budget.
Deno.test(
  'handleRequest: invalid tokens do NOT consume the rate-limit budget',
  async () => {
    resetState();
    const admin = makeAdmin();
    // Hammer with a bogus token — none of these should count against any
    // order_id's budget since rate-limit is keyed by a verified payload.
    for (let i = 0; i < 50; i++) {
      const res = await handleRequest(
        makePostReq({ token: 'bogus' }),
        admin
      );
      assertEquals(res.status, 401);
      await res.body?.cancel();
    }
    // A subsequent valid-token call should still be allowed.
    const validOrderId = 'ord_post-bogus-storm-00000000000000001';
    const valid = await signOrderToken(validOrderId);
    const okRes = await handleRequest(
      makePostReq({ token: valid }),
      makeAdmin({
        order: { data: { ...FAKE_ORDER, id: validOrderId }, error: null },
        items: { data: [], error: null },
      })
    );
    assertEquals(okRes.status, 200);
  }
);

// Log format — structured JSON, matching sign-order-token's pattern.
Deno.test(
  'handleRequest: warnings on invalid token are JSON with fn + step + reason',
  async () => {
    resetState();
    const originalWarn = console.warn;
    const captured: string[] = [];
    console.warn = (...args: unknown[]) => {
      captured.push(args.map(String).join(' '));
    };
    try {
      await handleRequest(
        makePostReq({ token: 'definitely-not-valid' }),
        makeAdmin()
      );
    } finally {
      console.warn = originalWarn;
    }
    if (captured.length === 0) {
      throw new Error('expected at least one console.warn entry');
    }
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(captured[0]);
    } catch {
      throw new Error(`log was not JSON: ${captured[0]}`);
    }
    assertEquals(parsed?.fn, 'get-order-by-token');
    assertEquals(parsed?.step, 'verify_token');
    if (typeof parsed?.reason !== 'string' || !parsed.reason) {
      throw new Error('reason field missing or empty in structured log');
    }
  }
);
