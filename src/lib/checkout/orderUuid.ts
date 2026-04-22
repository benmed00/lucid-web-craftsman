/**
 * Canonical Postgres `orders.id` shape (hex UUID) for payment-return URLs and APIs.
 *
 * **Keep in sync** with `supabase/functions/order-lookup/lib/order_uuid.ts` (Deno).
 */
export const ORDER_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeOrderUuid(value: string): boolean {
  const v = value.trim();
  if (!v || v.startsWith('cs_')) return false;
  return ORDER_UUID_PATTERN.test(v);
}
