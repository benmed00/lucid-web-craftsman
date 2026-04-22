/**
 * Dispatch logic for `/order-confirmation` — pure function so the entry
 * component can be dumb and the decision tree is exhaustively testable.
 *
 * =====================================================================
 * The problem this replaces
 * =====================================================================
 *
 * Before: `OrderConfirmationEntry` routed to `PaymentSuccess` whenever
 * the URL contained ANY of `order_id`, `order`, or a UUID-shaped
 * `session_id`. That meant every email click (`/order-confirmation?order=<uuid>`)
 * went through `PaymentSuccess`, which did a lookup by `stripe_session_id`
 * and then redirected back to `/order-confirmation?order_id=<uuid>&payment_complete=1`
 * — an entirely unnecessary round-trip days/weeks after the payment.
 *
 * =====================================================================
 * The model this implements
 * =====================================================================
 *
 * "Fresh payment return" means the user JUST finished paying and the URL
 * still carries the signal the gateway left there. There are exactly
 * three shapes we treat as fresh:
 *
 *   (R1) Stripe legacy success URL:  `?session_id=cs_<anything>`
 *   (R2) PayPal return URL:          `?paypal=true&token=<pp>&order_id=<uuid>`
 *   (R3) SPA continuation marker:    `?payment_complete=1` (set by
 *                                    PaymentSuccess itself after cleaning
 *                                    sensitive params) — keeps the
 *                                    success UI mounted on reload
 *
 * Anything else is a STALE navigation — an email click, bookmark, shared
 * link, or page refresh outside the 15-minute Stripe return window.
 * These must go to `OrderConfirmation` directly, which reads `order_id`
 * from search params and runs the signed-token flow.
 *
 * =====================================================================
 * Legacy parameter normalization
 * =====================================================================
 *
 * Two legacy param shapes ship in old emails and external links:
 *
 *   - `?order=<uuid>`             (older email generator)
 *   - `?session_id=<uuid>`        (UUID accidentally put into the Stripe
 *                                 session_id slot — mis-encoded URL)
 *
 * When we see either, we rewrite the URL to the canonical
 * `?order_id=<uuid>` and let `OrderConfirmation` render. The rewrite is a
 * `replace` navigation so browser history isn't polluted with the old
 * shape.
 */
import { looksLikeOrderUuid } from './orderUuid';

export type OrderConfirmationRoute =
  /** Render `<PaymentSuccess>` with the current URL (fresh return). */
  | { kind: 'payment_success' }
  /** Render `<OrderConfirmation>` with the current URL (canonical or token). */
  | { kind: 'order_confirmation' }
  /**
   * Rewrite the URL to `?order_id=<value>` (plus any preserved params),
   * then re-evaluate. The entry component uses `useNavigate(..., { replace })`.
   */
  | {
      kind: 'canonicalize';
      nextSearch: string;
    };

/**
 * Characterize a URL's `searchParams` and decide which page to mount.
 *
 * Keep this pure — no hooks, no DOM access, no navigation. Easy to test.
 */
export function classifyOrderConfirmationRoute(
  searchParams: URLSearchParams
): OrderConfirmationRoute {
  const sessionIdRaw = searchParams.get('session_id')?.trim() || '';
  const orderIdRaw = searchParams.get('order_id')?.trim() || '';
  const legacyOrderRaw = searchParams.get('order')?.trim() || '';
  const paymentComplete = searchParams.get('payment_complete') === '1';
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalToken = searchParams.get('token')?.trim() || '';

  // R1 — Stripe legacy success URL: session_id starts with `cs_`.
  const isFreshStripeReturn = sessionIdRaw.startsWith('cs_');

  // R2 — PayPal fresh return: explicit `paypal=true` + PayPal's `token`
  // + a UUID-shaped `order_id`. All three are set by create-paypal-payment.
  const isFreshPayPalReturn =
    isPayPal &&
    paypalToken.length > 0 &&
    orderIdRaw.length > 0 &&
    looksLikeOrderUuid(orderIdRaw);

  // R3 — SPA continuation marker, honoured regardless of other params so a
  // page refresh after sensitive-param cleanup stays on PaymentSuccess.
  const isFreshReturn =
    isFreshStripeReturn || isFreshPayPalReturn || paymentComplete;

  if (isFreshReturn) {
    return { kind: 'payment_success' };
  }

  // Canonical `order_id=<uuid>` → render OrderConfirmation directly.
  if (orderIdRaw && looksLikeOrderUuid(orderIdRaw)) {
    return { kind: 'order_confirmation' };
  }

  // Legacy `?order=<uuid>` → rewrite to `?order_id=<uuid>` so downstream
  // components don't have to know about the legacy param.
  if (legacyOrderRaw && looksLikeOrderUuid(legacyOrderRaw)) {
    return {
      kind: 'canonicalize',
      nextSearch: rewriteTo('order_id', legacyOrderRaw, searchParams, [
        'order',
      ]),
    };
  }

  // Mis-encoded UUID in the `session_id` slot (pre-stripe-webhook era).
  // `session_id=<uuid>` with NO `cs_` prefix → definitely not a fresh
  // Stripe return; canonicalize to `order_id`.
  if (
    sessionIdRaw &&
    !isFreshStripeReturn &&
    looksLikeOrderUuid(sessionIdRaw)
  ) {
    return {
      kind: 'canonicalize',
      nextSearch: rewriteTo('order_id', sessionIdRaw, searchParams, [
        'session_id',
      ]),
    };
  }

  // Nothing actionable — let OrderConfirmation render and show its own
  // empty / error state.
  return { kind: 'order_confirmation' };
}

/**
 * Build a new search string where `canonicalKey` = `value`, removing the
 * listed legacy keys but preserving anything else the caller added (eg.
 * utm tags, locale hints). Keys are written in insertion order of the
 * original `URLSearchParams`; the canonical key is always emitted first
 * so the resulting URL is deterministic.
 */
function rewriteTo(
  canonicalKey: string,
  value: string,
  original: URLSearchParams,
  dropKeys: string[]
): string {
  const drop = new Set([canonicalKey, ...dropKeys]);
  const next = new URLSearchParams();
  next.set(canonicalKey, value);
  for (const [k, v] of original.entries()) {
    if (drop.has(k)) continue;
    next.append(k, v);
  }
  return next.toString();
}
