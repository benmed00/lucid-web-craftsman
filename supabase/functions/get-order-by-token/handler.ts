/**
 * Pure request handler for `get-order-by-token`.
 *
 * Kept in its own module (separate from `index.ts`) so unit tests can import
 * `handleRequest` and inject a fake Supabase client, without triggering the
 * `Deno.serve` listener in `index.ts`.
 *
 * Auth model: the HMAC-signed token is the sole auth gate. Callers are
 * expected to pass a service-role client; `verifyTokenPayload` enforces
 * signature, type, and TTL (15 min for `order_access`).
 *
 * Response shape: order + items, with `order.metadata` narrowed to
 * `PUBLIC_ORDER_METADATA_KEYS` AND `order.shipping_address` narrowed to
 * `PUBLIC_SHIPPING_ADDRESS_KEYS` only. The raw DB `metadata` column may
 * contain fingerprinting/PII fields (e.g. `client_ip`, `stripe_session_id`)
 * that must NOT be returned to an unauthenticated caller holding only the
 * HMAC token. `shipping_address` is user-submitted but we still prune down
 * to the subset the UI actually consumes (principle of least disclosure).
 *
 * Contract: 400 on malformed body / bad token shape, 401 on bad/expired/
 * wrong-type token, 404 if order missing, 429 if order_id is being hammered
 * with a valid token, 500 on unexpected error. No fallbacks, no synthetic
 * data — callers must surface the status code.
 *
 * Log format: `console.log/warn/error(JSON.stringify({ fn, step, order_id?,
 * reason?, ... }))` to match `sign-order-token`'s pattern and stay parseable
 * by Supabase log search.
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  verifyTokenPayload,
  type TokenPayload,
} from '../_shared/invoice/token.ts';
import {
  pickPublicOrderMetadata,
  pickPublicShippingAddress,
  PUBLIC_ORDER_METADATA_KEYS,
  PUBLIC_SHIPPING_ADDRESS_KEYS,
  type PublicOrderMetadata,
  type PublicShippingAddress,
} from '../_shared/order-response-whitelists.ts';
import {
  memoryRateLimitStore,
  type RateLimitResult,
  type RateLimitStore,
} from '../_shared/rate-limit/rate-limit.ts';

// Re-export so existing external consumers (tests, docs, potential future
// direct importers) keep working unchanged. The source of truth now lives
// in _shared/order-response-whitelists.ts.
export {
  pickPublicOrderMetadata,
  pickPublicShippingAddress,
  PUBLIC_ORDER_METADATA_KEYS,
  PUBLIC_SHIPPING_ADDRESS_KEYS,
};
export type { PublicOrderMetadata, PublicShippingAddress };

const FN_NAME = 'get-order-by-token' as const;

/** Rate-limit budget: 20 requests per minute per `order_id`. Chosen to be
 *  generous for legitimate page reloads / tab restores during the 15-minute
 *  token window, while closing the door on brute replay. */
const RATE_LIMIT_MAX_ATTEMPTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ---------------------------------------------------------------------------
// Schemas — single source of truth for both types and `.select(...)` strings.
// ---------------------------------------------------------------------------

/** Request body. Rejects non-string or empty-string tokens at the edge. */
export const RequestBodySchema = z.object({
  token: z.string().min(1),
});

/**
 * `OrderRow` — exact shape returned by `SELECT … FROM orders`.
 * Kept as a Zod schema so the column list below is derivable (no drift)
 * and test fixtures can be validated at build time.
 */
export const OrderRowSchema = z.object({
  id: z.string(),
  status: z.string().nullable(),
  order_status: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  created_at: z.string(),
  shipping_address: z.record(z.unknown()).nullable(),
  metadata: z.record(z.unknown()).nullable(),
  payment_method: z.string().nullable(),
  user_id: z.string().nullable(),
  pricing_snapshot: z.record(z.unknown()).nullable(),
  subtotal_amount: z.number().nullable(),
  discount_amount: z.number().nullable(),
  shipping_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
});
export type OrderRow = z.infer<typeof OrderRowSchema>;

export const OrderItemRowSchema = z.object({
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  product_snapshot: z.record(z.unknown()).nullable(),
  // DB column: `product_id INTEGER REFERENCES products(id)` — must be a
  // number or null. Aligns with the client-side `OrderByTokenResponse`.
  product_id: z.number().nullable(),
});
export type OrderItemRow = z.infer<typeof OrderItemRowSchema>;

/**
 * Derived at module load so the select string is byte-for-byte identical to
 * the schema. Adding/removing a field in the schema updates the query
 * automatically — no more silent drift between column list and type.
 */
export const ORDER_SELECT: string = Object.keys(OrderRowSchema.shape).join(
  ', '
);
export const ITEMS_SELECT: string = Object.keys(
  OrderItemRowSchema.shape
).join(', ');

// Whitelists live in _shared/order-response-whitelists.ts — re-exported above.
// Shape of the `order` object actually returned — `metadata` and
// `shipping_address` both swapped for their whitelisted views.
export type PublicOrderRow = Omit<
  OrderRow,
  'metadata' | 'shipping_address'
> & {
  metadata: PublicOrderMetadata | null;
  shipping_address: PublicShippingAddress | null;
};

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

type LogLevel = 'log' | 'warn' | 'error';

interface LogFields {
  step: string;
  order_id?: string | null;
  reason?: string;
  [extra: string]: unknown;
}

function emit(level: LogLevel, fields: LogFields): void {
  const payload = JSON.stringify({ fn: FN_NAME, ...fields });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

/**
 * Narrow an `unknown` catch value to a safe string. `catch` binds as `unknown`
 * under strict TS because anything can be thrown, not just `Error`.
 */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function handleRequest(
  req: Request,
  admin: SupabaseClient,
  /**
   * Rate-limit store. Defaults to the module-level in-memory store so
   * callers and existing tests don't need to wire anything. Production
   * `index.ts` passes a composite Postgres-primary + memory-fallback store.
   */
  rateLimitStore: RateLimitStore = memoryRateLimitStore
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse body first so a malformed JSON payload yields 400, not 500.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Zod is the runtime truth — TS type annotations alone don't validate.
  const parsed = RequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: 'Missing token' }, 400);
  }
  const { token } = parsed.data;

  // Isolated try so signature/format/expiry failures become 401, not 500.
  // `verifyTokenPayload` owns all three checks (signature, shape, exp).
  let payload: TokenPayload;
  try {
    payload = await verifyTokenPayload(token);
  } catch (e: unknown) {
    emit('warn', { step: 'verify_token', reason: messageOf(e) });
    return json({ error: 'Invalid or expired token' }, 401);
  }

  // Reject long-lived `invoice_access` tokens here — that endpoint is a
  // separate surface and must not grant access to the confirmation payload.
  if (payload.type !== 'order_access') {
    emit('warn', {
      step: 'type_gate',
      order_id: payload.order_id,
      reason: 'wrong_token_type',
      token_type: payload.type,
    });
    return json({ error: 'Wrong token type' }, 401);
  }

  const orderId: string = payload.order_id;

  // Rate-limit by `order_id` — the token is replayable within its 15-minute
  // TTL, and while the signature is unforgeable, a leaked link shouldn't
  // permit unlimited replays. Runs AFTER token verify so invalid tokens
  // can't exhaust the budget.
  const limit: RateLimitResult = await rateLimitStore.consume(
    `order:${orderId}`,
    {
      maxAttempts: RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    }
  );
  if (!limit.allowed) {
    const retryAfter: number = Math.max(
      1,
      Math.ceil((limit.resetMs - Date.now()) / 1000)
    );
    emit('warn', {
      step: 'rate_limit',
      order_id: orderId,
      reason: 'limit_exceeded',
      retry_after_seconds: retryAfter,
    });
    return json({ error: 'Too many requests' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }

  try {
    // `maybeSingle` (not `single`) so a missing row returns `data: null`
    // instead of throwing — lets us distinguish 404 from a real DB error.
    const {
      data: order,
      error: orderErr,
    }: { data: OrderRow | null; error: PostgrestError | null } = await admin
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .maybeSingle<OrderRow>();

    if (orderErr) {
      emit('error', {
        step: 'db_query_orders',
        order_id: orderId,
        reason: orderErr.message,
        pg_code: orderErr.code,
      });
      return json({ error: 'Database error' }, 500);
    }
    if (!order) {
      emit('warn', {
        step: 'lookup_orders',
        order_id: orderId,
        reason: 'not_found',
      });
      return json({ error: 'Order not found' }, 404);
    }

    const {
      data: items,
      error: itemsErr,
    }: { data: OrderItemRow[] | null; error: PostgrestError | null } =
      await admin
        .from('order_items')
        .select(ITEMS_SELECT)
        .eq('order_id', orderId)
        .returns<OrderItemRow[]>();

    if (itemsErr) {
      emit('error', {
        step: 'db_query_order_items',
        order_id: orderId,
        reason: itemsErr.message,
        pg_code: itemsErr.code,
      });
      return json({ error: 'Database error' }, 500);
    }

    // Normalize null → [] so consumers can iterate unconditionally.
    const resolvedItems: OrderItemRow[] = items ?? [];

    // Strip private metadata + prune shipping-address fields before leaving
    // the server. See the PRIVACY block at the top of this file for why.
    const safeOrder: PublicOrderRow = {
      ...order,
      metadata: pickPublicOrderMetadata(order.metadata),
      shipping_address: pickPublicShippingAddress(order.shipping_address),
    };

    emit('log', {
      step: 'respond_ok',
      order_id: orderId,
      items_count: resolvedItems.length,
    });
    return json({ order: safeOrder, items: resolvedItems });
  } catch (err: unknown) {
    // Full detail stays server-side; client gets a generic message so we
    // never leak stack paths, URLs, or PII that bubbled up from the SDK.
    emit('error', {
      step: 'unexpected',
      order_id: orderId,
      reason: messageOf(err),
    });
    return json({ error: 'Internal server error' }, 500);
  }
}
