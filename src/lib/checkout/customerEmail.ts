/**
 * Canonical email for display — mirrors precedence in
 * `supabase/functions/_shared/order-response-whitelists.ts`.
 */
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
