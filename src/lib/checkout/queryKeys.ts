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
