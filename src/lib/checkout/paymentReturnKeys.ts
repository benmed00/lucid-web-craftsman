/**
 * Payment return uses canonical `order_id=<uuid>` on `/order-confirmation`.
 * Legacy: `order=<uuid>`, UUID mis-encoded as `session_id`, or Stripe `session_id=cs_*`.
 */
import { looksLikeOrderUuid, ORDER_UUID_PATTERN } from './orderUuid';

export { looksLikeOrderUuid, ORDER_UUID_PATTERN };

/** Canonical Postgres order id from `order_id`, then legacy `order` / UUID-shaped `session_id`. */
export function resolvePaymentReturnOrderId(
  searchParams: URLSearchParams
): string | null {
  const oid = searchParams.get('order_id')?.trim();
  if (oid && looksLikeOrderUuid(oid)) return oid;
  const legacyOrder = searchParams.get('order')?.trim();
  if (legacyOrder && looksLikeOrderUuid(legacyOrder)) return legacyOrder;
  const sid = searchParams.get('session_id')?.trim();
  if (sid && looksLikeOrderUuid(sid)) return sid;
  return null;
}

/** Legacy Stripe Checkout return URLs that still use `session_id=cs_*`. */
export function legacyStripeCheckoutSessionId(
  searchParams: URLSearchParams
): string | null {
  const sid = searchParams.get('session_id')?.trim();
  if (sid?.startsWith('cs_')) return sid;
  return null;
}

/** @deprecated Use `resolvePaymentReturnOrderId` + `legacyStripeCheckoutSessionId`. */
export function resolvePaymentReturnSessionKey(
  searchParams: URLSearchParams
): string | null {
  return (
    resolvePaymentReturnOrderId(searchParams) ||
    legacyStripeCheckoutSessionId(searchParams)
  );
}
