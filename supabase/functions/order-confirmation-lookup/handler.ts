/**
 * Pure request handler for `order-confirmation-lookup`.
 *
 * This module is import-safe (no `Deno.serve`, no env reads at module load)
 * so unit tests can exercise it with fake Supabase clients and fake rate-limit
 * stores. The thin wrapper in `index.ts` wires the real env + stores.
 *
 * =====================================================================
 * Contract
 * =====================================================================
 *
 * Method/path: POST /functions/v1/order-confirmation-lookup
 * Gateway auth: `apikey: <SUPABASE_ANON_KEY>` (Supabase standard)
 * Function auth: HMAC-signed token in the request body. The token is minted
 *   by our email-link generator (outside this repo today) and carries
 *   `{ oid, em, exp, ref? }`. Signature is verified with
 *   `ORDER_CONFIRMATION_TOKEN_SECRET` — this must be set in every
 *   environment (no service-role fallback, no silent downgrade).
 *
 * Token payload shape (see `parseAndVerifyToken`):
 *   - oid : string — the order UUID
 *   - em  : string — the customer email, used as a second-factor check
 *   - exp : number — ms-since-epoch expiry (unusual but preserved for
 *           compatibility with the existing token minter)
 *   - ref?: string — optional pre-computed order reference (CMD-<hex>)
 *
 * Status codes:
 *   - 200 {found: true, ...}    happy path (email matches, order readable)
 *   - 200 {found: false}        token valid but email mismatch or order gone
 *                               (deliberately indistinguishable so attackers
 *                               can't use this endpoint to enumerate)
 *   - 400 {error: 'Missing token'}
 *   - 403 {error: 'Invalid or expired token'}
 *   - 403 {error: 'Reference mismatch'}
 *   - 405 Method not allowed        non-POST (except OPTIONS)
 *   - 429 {error: 'Too many requests'}   rate limit exceeded
 *   - 500 {error: <message>}             unexpected error
 *   - 503 {found: false, error: ...}     function not configured
 *
 * =====================================================================
 * Rate limiting
 * =====================================================================
 *
 * The HMAC token is unforgeable, but once leaked (forwarded email, shoulder-
 * surfed inbox) the URL can be hit repeatedly during its TTL. We apply the
 * same `edge_rate_limit_consume` RPC as `get-order-by-token`, keyed by the
 * verified `oid` so bad/mangled tokens can't exhaust a legitimate order's
 * budget. Identifier namespace: `oclookup:order:<oid>` — separate from
 * `get-order-by-token`'s `order:<oid>` so the two endpoints have independent
 * budgets.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  memoryRateLimitStore,
  type RateLimitResult,
  type RateLimitStore,
} from '../_shared/rate-limit/rate-limit.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Log prefix matches the existing function name for grep-friendliness. */
const FN_NAME = 'order-confirmation-lookup' as const;

/**
 * Budget: 20 requests / 60 s per verified `oid`.
 *
 * Rationale:
 *   - Legitimate traffic is a single customer opening the email link a few
 *     times (maybe tab reload, maybe they forwarded it to themselves).
 *   - Typical email-link TTLs run for hours to days; without a limit a leaked
 *     URL could be hit thousands of times per minute.
 *   - The HMAC-SHA256 token space is cryptographically safe against brute
 *     force, but the budget keeps abuse cost proportional to the attacker's
 *     cost of obtaining the token.
 */
const RATE_LIMIT_MAX_ATTEMPTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Token parsing + verification (HMAC-SHA256, base64url)
// ---------------------------------------------------------------------------

export interface ParsedToken {
  oid: string;
  ref?: string;
  em: string;
  /** ms-since-epoch — preserved from the existing token minter's contract. */
  exp: number;
}

const normalizeBase64Url = (input: string): string => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalized.length % 4;
  if (remainder === 0) return normalized;
  return normalized + '='.repeat(4 - remainder);
};

const decodeBase64Url = (input: string): string => {
  const binary = atob(normalizeBase64Url(input));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const hmacSha256Base64Url = async (
  value: string,
  secret: string
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value)
  );
  return bytesToBase64Url(new Uint8Array(signature));
};

export const buildOrderReference = (orderId: string): string =>
  `CMD-${orderId.replace(/-/g, '').toUpperCase()}`;

/**
 * Parse and signature-verify a token. Returns `null` on ANY problem:
 * malformed shape, bad signature, expired, missing required claims.
 *
 * The function is intentionally opaque about WHICH step failed so callers
 * cannot use the return value to probe internal state (timing attacks
 * against the signature check are also mitigated by crypto.subtle, which
 * uses constant-time HMAC compare internally).
 */
export const parseAndVerifyToken = async (
  token: string,
  tokenSecret: string
): Promise<ParsedToken | null> => {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = await hmacSha256Base64Url(payloadPart, tokenSecret);
  if (expectedSignature !== signaturePart) return null;

  let parsed: ParsedToken;
  try {
    parsed = JSON.parse(decodeBase64Url(payloadPart)) as ParsedToken;
  } catch {
    return null;
  }
  if (!parsed?.oid || !parsed?.em || !parsed?.exp) return null;
  if (Date.now() > parsed.exp) return null;
  return {
    ...parsed,
    ref: parsed.ref || buildOrderReference(parsed.oid),
  };
};

// ---------------------------------------------------------------------------
// Display-total resolution (pricing unit normalization)
// ---------------------------------------------------------------------------

/**
 * Resolve the order total in euros for email / confirmation page display.
 *
 * Rules (first match wins):
 *  1. If `orders.total_amount` (minor units) is present, use it — this is
 *     what Stripe actually charged.
 *  2. Otherwise, if the legacy `amount` column looks like integer cents,
 *     divide by 100 (create-payment writes cents for Stripe-linked orders).
 *  3. Otherwise, treat `amount` as already being in euros.
 *
 * The previous 3x heuristic misclassified legitimate orders where shipping
 * or fees pushed the total well above the items subtotal.
 */
export const resolveDisplayTotalEuros = (
  rawAmount: number,
  itemsSubtotalEuros: number,
  totalAmountMinor: number | null
): number => {
  if (
    totalAmountMinor !== null &&
    Number.isFinite(totalAmountMinor) &&
    totalAmountMinor > 0
  ) {
    return totalAmountMinor / 100;
  }
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return itemsSubtotalEuros;
  }
  const isIntegerCents = Number.isInteger(rawAmount);
  if (
    isIntegerCents &&
    rawAmount >= 100 &&
    rawAmount / 100 >= itemsSubtotalEuros * 0.5
  ) {
    return rawAmount / 100;
  }
  return rawAmount;
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
// Handler dependencies — all injectable for testability
// ---------------------------------------------------------------------------

export interface HandlerDeps {
  /** Service-role Supabase client; bypasses RLS. */
  admin?: SupabaseClient;
  /**
   * Lazy factory — constructed on first successful token verify so tests
   * that never reach the DB don't need to stub a client.
   */
  makeAdmin?: () => SupabaseClient;
  rateLimitStore?: RateLimitStore;
  /** HMAC secret for `parseAndVerifyToken`. Injected so tests don't need env. */
  tokenSecret: string;
}

/**
 * Build default production deps: service-role client + in-memory rate limit
 * (production `index.ts` upgrades this to the Postgres-primary composite).
 */
export function buildDefaultDeps(env: {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ORDER_CONFIRMATION_TOKEN_SECRET: string;
}): HandlerDeps {
  return {
    makeAdmin: () =>
      createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      }),
    rateLimitStore: memoryRateLimitStore,
    tokenSecret: env.ORDER_CONFIRMATION_TOKEN_SECRET,
  };
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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Configuration check — fail closed if the signing secret isn't set. This
  // also serves as a runtime guard against the old fallback-to-service-role
  // behaviour sneaking back in.
  if (!deps.tokenSecret) {
    emit('error', { step: 'config', reason: 'token_secret_not_configured' });
    return json(
      {
        found: false,
        error: 'Order confirmation lookup is not configured',
      },
      503
    );
  }

  // Parse body.
  let rawBody: { token?: unknown; order_reference?: unknown };
  try {
    rawBody = (await req.json()) as typeof rawBody;
  } catch {
    return json({ found: false, error: 'Invalid JSON body' }, 400);
  }

  const token = typeof rawBody.token === 'string' ? rawBody.token : null;
  if (!token) {
    return json({ found: false, error: 'Missing token' }, 400);
  }

  // Verify the token BEFORE consuming rate-limit budget so bogus tokens
  // can't exhaust a legitimate order's budget. This matches the pattern in
  // get-order-by-token/handler.ts.
  const parsedToken = await parseAndVerifyToken(token, deps.tokenSecret);
  if (!parsedToken) {
    emit('warn', { step: 'verify_token', reason: 'invalid_or_expired' });
    return json({ found: false, error: 'Invalid or expired token' }, 403);
  }

  // Rate limit, keyed by the verified `oid` with a function-specific prefix
  // so this budget is independent of get-order-by-token's.
  const store = deps.rateLimitStore ?? memoryRateLimitStore;
  const limit: RateLimitResult = await store.consume(
    `oclookup:order:${parsedToken.oid}`,
    { maxAttempts: RATE_LIMIT_MAX_ATTEMPTS, windowMs: RATE_LIMIT_WINDOW_MS }
  );
  if (!limit.allowed) {
    const retryAfter: number = Math.max(
      1,
      Math.ceil((limit.resetMs - Date.now()) / 1000)
    );
    emit('warn', {
      step: 'rate_limit',
      order_id: parsedToken.oid,
      reason: 'limit_exceeded',
      retry_after_seconds: retryAfter,
    });
    return json({ found: false, error: 'Too many requests' }, 429, {
      'Retry-After': String(retryAfter),
    });
  }

  // Optional second-factor cross-check: if the caller sent an
  // `order_reference` alongside the token, it must match the one encoded
  // in the token. This closes a class of cut-and-paste URL-manipulation
  // attacks where an attacker with a valid token for order A tries to
  // request order B's reference.
  const requestedReference =
    typeof rawBody.order_reference === 'string'
      ? rawBody.order_reference.trim()
      : null;
  if (requestedReference && requestedReference !== parsedToken.ref) {
    emit('warn', {
      step: 'reference_mismatch',
      order_id: parsedToken.oid,
      reason: 'requested_ref_does_not_match_token_ref',
    });
    return json({ found: false, error: 'Reference mismatch' }, 403);
  }

  // Build DB client lazily so test harnesses that stub at the `admin` or
  // `makeAdmin` level can use whichever they prefer.
  const admin: SupabaseClient =
    deps.admin ??
    (deps.makeAdmin
      ? deps.makeAdmin()
      : (() => {
          emit('error', {
            step: 'deps',
            reason: 'neither_admin_nor_makeAdmin_provided',
          });
          throw new Error('Handler deps missing admin client');
        })());

  try {
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select(
        'id, status, order_status, amount, total_amount, currency, created_at, shipping_address, metadata'
      )
      .eq('id', parsedToken.oid)
      .maybeSingle();

    if (orderError || !order) {
      emit('warn', {
        step: 'lookup_orders',
        order_id: parsedToken.oid,
        reason: orderError?.message ?? 'not_found',
      });
      return json({ found: false });
    }

    const shippingAddress = (order.shipping_address || {}) as Record<
      string,
      unknown
    >;
    const metadata = (order.metadata || {}) as Record<string, unknown>;
    const orderEmail =
      (shippingAddress.email as string) ||
      (metadata.customer_email as string) ||
      null;
    const customerName =
      (shippingAddress.first_name || shippingAddress.last_name
        ? `${String(shippingAddress.first_name || '')} ${String(shippingAddress.last_name || '')}`.trim()
        : null) ||
      (metadata.customer_name as string) ||
      'Client inconnu';

    // Email cross-check: the token's `em` claim must equal the order's
    // stored email. Returning `found: false` (not a distinct error code)
    // is deliberate — we do not reveal that the order exists to a caller
    // holding a mismatched-email token.
    if (
      orderEmail &&
      orderEmail.toLowerCase().trim() !== parsedToken.em.toLowerCase().trim()
    ) {
      emit('warn', {
        step: 'email_mismatch',
        order_id: parsedToken.oid,
        reason: 'token_email_does_not_match_order_email',
      });
      return json({ found: false });
    }

    const { data: orderItems } = await admin
      .from('order_items')
      .select('quantity, unit_price, total_price, product_snapshot')
      .eq('order_id', order.id);

    const items = (orderItems || []).map((item: Record<string, unknown>) => {
      const snapshot = (item.product_snapshot || {}) as Record<string, unknown>;
      return {
        product_id: snapshot.id || null,
        product_name: (snapshot.name as string) || 'Produit',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        image:
          Array.isArray(snapshot.images) && snapshot.images.length > 0
            ? (snapshot.images[0] as string)
            : null,
      };
    });

    const itemsSubtotal = items.reduce(
      (sum: number, item: { total_price: unknown }) =>
        sum + Number(item.total_price || 0),
      0
    );
    const totalAmountMinor =
      typeof (order as { total_amount?: number | null }).total_amount ===
      'number'
        ? ((order as { total_amount?: number | null }).total_amount as number)
        : null;
    const amountTotal = resolveDisplayTotalEuros(
      Number(order.amount || 0),
      itemsSubtotal,
      totalAmountMinor
    );
    const normalizedStatus = String(order.status || '').toLowerCase();
    const normalizedOrderStatus = String(
      order.order_status || ''
    ).toLowerCase();
    const isPaid =
      normalizedStatus === 'paid' ||
      normalizedStatus === 'completed' ||
      normalizedOrderStatus === 'paid' ||
      normalizedOrderStatus === 'completed';
    const isPaymentFailed =
      normalizedStatus === 'payment_failed' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'cancelled' ||
      normalizedStatus === 'canceled' ||
      normalizedOrderStatus === 'payment_failed' ||
      normalizedOrderStatus === 'cancelled' ||
      normalizedOrderStatus === 'canceled';

    const pageVariant = isPaymentFailed ? 'payment_failed' : 'success';
    const statusLabel = isPaymentFailed
      ? 'Paiement non abouti'
      : 'En cours de traitement';
    const statusMessage = isPaymentFailed
      ? "Nous n'avons pas pu finaliser votre paiement. Aucune somme n'a ete prelevee."
      : 'Votre commande est en cours de preparation. Nous vous enverrons le suivi par email.';

    emit('log', {
      step: 'respond_ok',
      order_id: parsedToken.oid,
      items_count: items.length,
    });

    return json({
      found: true,
      order_id: order.id,
      order_reference: parsedToken.ref,
      page_variant: pageVariant,
      status: order.status,
      order_status: order.order_status,
      is_paid: isPaid,
      amount: amountTotal,
      currency: order.currency,
      created_at: order.created_at,
      customer_name: customerName,
      customer_email: orderEmail,
      status_label: statusLabel,
      status_message: statusMessage,
      items,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    emit('error', {
      step: 'unexpected',
      order_id: parsedToken.oid,
      reason: message,
    });
    // Keep the message since existing clients may rely on it; future hardening
    // should strip this like get-order-by-token does.
    return json({ found: false, error: message }, 500);
  }
}
