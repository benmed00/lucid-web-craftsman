/**
 * Shared response-side whitelists for order data.
 *
 * Promoted from `get-order-by-token/handler.ts` so a second endpoint that
 * surfaces order metadata (e.g. `order-confirmation-lookup`, future invoice
 * preview endpoints) can enforce the same PII contract without duplicating
 * key lists.
 *
 * Principle: the raw `orders.metadata` JSONB accumulates write-side concerns
 * the storefront never needs (correlation_id, client_ip, device
 * fingerprinting, Stripe session ids). Any public-facing endpoint should
 * reduce the payload to only the keys the UI consumes. `shipping_address`
 * follows the same least-disclosure rule even though the user is the
 * original source of that data.
 *
 * To add a new key: update the tuple **and** the matching leak-regression
 * test in the consuming function's test file (e.g.
 * `get-order-by-token/index_test.ts` has a needle check on the serialized
 * response for every sensitive field).
 */

// ---------------------------------------------------------------------------
// orders.metadata
// ---------------------------------------------------------------------------

export const PUBLIC_ORDER_METADATA_KEYS = [
  'customer_email',
  'payment_method_label',
] as const;

export type PublicOrderMetadataKey =
  (typeof PUBLIC_ORDER_METADATA_KEYS)[number];

export type PublicOrderMetadata = Partial<
  Record<PublicOrderMetadataKey, unknown>
>;

export function pickPublicOrderMetadata(
  raw: Record<string, unknown> | null | undefined
): PublicOrderMetadata | null {
  if (!raw) return null;
  const out: PublicOrderMetadata = {};
  for (const key of PUBLIC_ORDER_METADATA_KEYS) {
    if (key in raw) out[key] = raw[key];
  }
  return Object.keys(out).length === 0 ? null : out;
}

// ---------------------------------------------------------------------------
// orders.shipping_address
// ---------------------------------------------------------------------------

export const PUBLIC_SHIPPING_ADDRESS_KEYS = [
  'first_name',
  'last_name',
  'email',
  'address_line1',
  'postal_code',
  'city',
  'country',
] as const;

export type PublicShippingAddressKey =
  (typeof PUBLIC_SHIPPING_ADDRESS_KEYS)[number];

export type PublicShippingAddress = Partial<
  Record<PublicShippingAddressKey, unknown>
>;

export function pickPublicShippingAddress(
  raw: Record<string, unknown> | null | undefined
): PublicShippingAddress | null {
  if (!raw) return null;
  const out: PublicShippingAddress = {};
  for (const key of PUBLIC_SHIPPING_ADDRESS_KEYS) {
    if (key in raw) out[key] = raw[key];
  }
  return Object.keys(out).length === 0 ? null : out;
}

/** Stripe `metadata.customer_email` wins over form `shipping_address.email`. */
export function resolveCustomerEmail(order: {
  metadata?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
}): string {
  const meta = order.metadata as { customer_email?: string } | undefined;
  if (
    typeof meta?.customer_email === 'string' &&
    meta.customer_email.trim().length > 0
  ) {
    return meta.customer_email.trim();
  }
  const ship = order.shipping_address as { email?: string } | undefined;
  if (typeof ship?.email === 'string' && ship.email.trim().length > 0) {
    return ship.email.trim();
  }
  return '';
}
