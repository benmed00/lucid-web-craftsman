/**
 * Storefront sync policy: customer cart/wishlist vs Supabase.
 * Admin (elevated) sessions use separate local persistence so browsing the shop
 * does not read/write the same DB rows as a real customer session.
 */
import { fetchIsAdminUserForCartPolicy } from '@/services/cartSyncPolicyApi';

const POLICY_CACHE_PREFIX = 'cart_sync_policy_v1:';

let policyKnown = false;
let elevatedUser = false;
let lastResolvedKey: string | null = null;
let inFlight: Promise<void> | null = null;
let inFlightKey: string | null = null;

export function isSupabaseCartSyncAllowed(): boolean {
  if (!policyKnown) return false;
  return !elevatedUser;
}

/** True only after policy resolved and user is an admin on the storefront. */
export function isElevatedStorefrontUser(): boolean {
  return policyKnown && elevatedUser;
}

/** DB-backed wishlist; false only when we know the user is elevated. */
export function isWishlistCloudSyncAllowed(): boolean {
  return !isElevatedStorefrontUser();
}

export function invalidateCartSyncPolicyCache(): void {
  lastResolvedKey = null;
  policyKnown = false;
  elevatedUser = false;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(POLICY_CACHE_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Resolve policy for the current auth subject. Call before cart persist rehydrate.
 * Deduplicates concurrent calls for the same subject so policyKnown is not cleared mid-flight.
 */
export function resolveCartSyncPolicy(userId: string | null): Promise<void> {
  const key = userId ?? 'guest';
  if (policyKnown && lastResolvedKey === key) {
    return Promise.resolve();
  }
  if (inFlight && inFlightKey === key) {
    return inFlight;
  }

  inFlightKey = key;
  inFlight = (async () => {
    policyKnown = false;
    elevatedUser = false;
    lastResolvedKey = key;

    if (!userId) {
      elevatedUser = false;
      policyKnown = true;
      return;
    }

    try {
      const cached = sessionStorage.getItem(`${POLICY_CACHE_PREFIX}${userId}`);
      if (cached === 'elevated') {
        elevatedUser = true;
        policyKnown = true;
        return;
      }
      if (cached === 'standard') {
        elevatedUser = false;
        policyKnown = true;
        return;
      }
    } catch {
      /* ignore */
    }

    try {
      elevatedUser = await fetchIsAdminUserForCartPolicy(userId);
      try {
        sessionStorage.setItem(
          `${POLICY_CACHE_PREFIX}${userId}`,
          elevatedUser ? 'elevated' : 'standard'
        );
      } catch {
        /* ignore */
      }
    } catch {
      elevatedUser = false;
    } finally {
      policyKnown = true;
    }
  })().finally(() => {
    inFlight = null;
    inFlightKey = null;
  });

  return inFlight;
}

/** Zustand persist bucket: customer vs admin storefront browsing */
export function getCartPersistStorageName(): string {
  return elevatedUser ? 'cart-storage-elevated' : 'cart-storage';
}

/**
 * Clears in-memory policy state and in-flight dedupe. For Vitest only — keeps tests
 * isolated without `vi.resetModules()`.
 */
export function resetCartSyncPolicyStateForTests(): void {
  policyKnown = false;
  elevatedUser = false;
  lastResolvedKey = null;
  inFlight = null;
  inFlightKey = null;
}
