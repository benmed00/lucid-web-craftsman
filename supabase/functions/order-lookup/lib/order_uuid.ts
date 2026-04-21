/**
 * Canonical Postgres `orders.id` shape (hex UUID) for `order_id` query/body validation.
 *
 * **Must match** `src/lib/checkout/orderUuid.ts` (`ORDER_UUID_PATTERN` / `looksLikeOrderUuid`).
 */
const ORDER_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeOrderUuid(value: string): boolean {
  const v = value.trim();
  if (!v || v.startsWith('cs_')) return false;
  return ORDER_UUID_PATTERN.test(v);
}
