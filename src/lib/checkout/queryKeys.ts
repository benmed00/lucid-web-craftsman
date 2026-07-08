/** TanStack Query keys for checkout, cart server mirror, wishlist. */

export const checkoutQueryKeys = {
  all: ['checkout'] as const,
  activeSession: (userId: string | null, guestId: string | null) =>
    ['checkout', 'session', 'active', userId ?? '', guestId ?? ''] as const,
  sessionById: (sessionId: string) =>
    ['checkout', 'session', sessionId] as const,
} as const;

export const cartServerQueryKeys = {
  all: ['cart', 'server'] as const,
  lines: (userId: string) => ['cart', 'server', 'lines', userId] as const,
} as const;

export const wishlistQueryKeys = {
  all: ['wishlist'] as const,
  list: (userId: string) => ['wishlist', userId] as const,
} as const;

/**
 * Shared predicate: matches TanStack Query keys under the `checkout` or
 * `cart` roots whose serialized parts reference any of the supplied
 * `guest_id` values. Used to target invalidation after a guest token
 * rotation without touching unrelated cache entries.
 *
 * Matches:
 *   - checkoutQueryKeys.activeSession(_, guestId) — guest_id at index 4
 *   - any future checkout/cart key that embeds guest_id as a string part
 *
 * Does NOT match `sessionById(...)` keys (they carry a session UUID,
 * not a guest_id) or keys under other roots.
 */
export function createGuestScopedQueryPredicate(
  guestIds: ReadonlyArray<string | null | undefined>
): (query: { queryKey: readonly unknown[] }) => boolean {
  const ids = new Set(
    guestIds.filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    )
  );

  if (ids.size === 0) {
    return () => false;
  }

  return (query) => {
    const key = query.queryKey;
    if (!Array.isArray(key) || key.length === 0) return false;
    const root = key[0];
    if (root !== 'checkout' && root !== 'cart') return false;
    return key.some(
      (part) => typeof part === 'string' && ids.has(part)
    );
  };
}
