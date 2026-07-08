/**
 * Rotation invalidation contract: after guest token rotation, only
 * checkout/cart query keys tied to the old or new guest_id must be
 * invalidated — never a global refetch.
 *
 * Run: bunx vitest run src/hooks/guestSessionRotationInvalidation.test.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  safeRemoveItem,
  safeSetItem,
} from '@/lib/storage/safeStorage';
import { checkoutQueryKeys, cartServerQueryKeys, wishlistQueryKeys } from '@/lib/checkout/queryKeys';
import type { GuestSession } from './useGuestSession';

const GUEST_SESSION_KEY = 'guest_session';

const OLD_GUEST = '11111111-2222-4333-8444-555555555555';
const NEW_GUEST = '99999999-8888-4777-8666-555555555555';
const OTHER_GUEST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const USER_ID = 'user-xyz';

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

// Prevent useCheckoutSession from touching auth / network in the second test
vi.mock('@/context/AuthContext', () => ({
  useOptimizedAuth: () => ({ user: null }),
  cleanupAuthState: () => {},
}));
vi.mock('@/lib/cart/cartSyncPolicy', () => ({
  resolveCartSyncPolicy: async () => {},
  isElevatedStorefrontUser: () => false,
}));
vi.mock('@/services/checkoutApi', () => ({
  fetchActiveCheckoutSessionByGuestId: async () => null,
  fetchActiveCheckoutSessionByUserId: async () => null,
  insertCheckoutSession: async () => null,
  updateCheckoutSessionRow: async () => {},
  signOutLocalScope: async () => {},
}));

import { useGuestSession } from './useGuestSession';
import { useCheckoutSession } from './useCheckoutSession';

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function seedRotationScenario(client: QueryClient) {
  // Keys that MUST be invalidated after rotation
  client.setQueryData(checkoutQueryKeys.activeSession(null, OLD_GUEST), { id: 'old' });
  client.setQueryData(checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST), { id: 'old-user' });
  // Cart line embedded with old guest id (guest-scoped shape)
  client.setQueryData(['cart', 'server', 'lines', OLD_GUEST], [{ line: 1 }]);

  // Keys that MUST stay untouched
  client.setQueryData(checkoutQueryKeys.activeSession(null, OTHER_GUEST), { id: 'other' });
  client.setQueryData(checkoutQueryKeys.sessionById('session-uuid-untouched'), { id: 'sid' });
  client.setQueryData(wishlistQueryKeys.list(USER_ID), [{ product: 1 }]);
  client.setQueryData(['products', 'list'], [{ id: 1 }]);
  client.setQueryData(cartServerQueryKeys.lines(USER_ID), [{ line: 99 }]);
  // Root-gate stress: even when the rotated guest_id happens to appear in
  // a wishlist / products key, the non-checkout/cart root must protect it.
  client.setQueryData(['wishlist', OLD_GUEST], [{ product: 2 }]);
  client.setQueryData(['wishlist', NEW_GUEST], [{ product: 3 }]);
  client.setQueryData(['products', 'by-guest', OLD_GUEST], [{ id: 42 }]);
  client.setQueryData(['products', 'by-guest', NEW_GUEST], [{ id: 43 }]);
}

function invalidatedKeys(client: QueryClient): string[] {
  return client
    .getQueryCache()
    .getAll()
    .filter((q) => q.state.isInvalidated)
    .map((q) => JSON.stringify(q.queryKey));
}

function seedExistingSession(guestId: string, signature: string, expiresAt: number) {
  const session: GuestSession = {
    guestId,
    signature,
    expiresAt,
    createdAt: Date.now(),
    device: { deviceType: 'desktop', os: 'Windows', browser: 'Chrome' },
  };
  safeSetItem(GUEST_SESSION_KEY, session, {
    storage: 'localStorage',
    ttl: 30 * 24 * 60 * 60 * 1000,
  });
}

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);

describe('useGuestSession → targeted invalidation on rotation', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });
  afterEach(() => {
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  it('invalidates only checkout/cart keys tied to the rotated guest_id', async () => {
    // Existing signed session that is expired → triggers rotation path
    seedExistingSession(OLD_GUEST, 'sig-old', Date.now() - 60_000);
    rpcMock.mockResolvedValue({
      data: {
        guest_id: NEW_GUEST,
        signature: 'sig-new',
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      },
      error: null,
    });

    const client = makeClient();
    seedRotationScenario(client);

    const { result } = renderHook(() => useGuestSession(), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('rotate_guest_token', {
      _old_guest_id: OLD_GUEST,
      _old_signature: 'sig-old',
    });

    const invalidated = invalidatedKeys(client);

    // Targeted set — must be invalidated
    expect(invalidated).toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(null, OLD_GUEST))
    );
    expect(invalidated).toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST))
    );
    expect(invalidated).toContain(
      JSON.stringify(['cart', 'server', 'lines', OLD_GUEST])
    );

    // Untouched set — must NOT be invalidated
    expect(invalidated).not.toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(null, OTHER_GUEST))
    );
    expect(invalidated).not.toContain(
      JSON.stringify(checkoutQueryKeys.sessionById('session-uuid-untouched'))
    );
    expect(invalidated).not.toContain(
      JSON.stringify(wishlistQueryKeys.list(USER_ID))
    );
    expect(invalidated).not.toContain(JSON.stringify(['products', 'list']));
    expect(invalidated).not.toContain(
      JSON.stringify(cartServerQueryKeys.lines(USER_ID))
    );
  });

  it('does not invalidate anything when there is no prior signed session (fresh mint)', async () => {
    rpcMock.mockResolvedValue({
      data: {
        guest_id: NEW_GUEST,
        signature: 'sig-new',
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      },
      error: null,
    });

    const client = makeClient();
    seedRotationScenario(client);

    const { result } = renderHook(() => useGuestSession(), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('create_guest_token');
    expect(invalidatedKeys(client)).toEqual([]);
  });
});

describe('useCheckoutSession → targeted refetch on guest-session:rotated event', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: null, error: null });
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });
  afterEach(() => {
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  it('invalidates only keys tied to the rotated guest_id, not the whole cache', async () => {
    const client = makeClient();
    seedRotationScenario(client);

    renderHook(() => useCheckoutSession(), { wrapper: wrapper(client) });

    // Simulate the rotation event dispatched by useGuestSession
    window.dispatchEvent(
      new CustomEvent('guest-session:rotated', {
        detail: { oldGuestId: OLD_GUEST, newGuestId: NEW_GUEST },
      })
    );

    await waitFor(() => {
      expect(
        client
          .getQueryCache()
          .find({ queryKey: checkoutQueryKeys.activeSession(null, OLD_GUEST) })
          ?.state.isInvalidated
      ).toBe(true);
    });

    const invalidated = invalidatedKeys(client);

    // Targeted
    expect(invalidated).toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(null, OLD_GUEST))
    );
    expect(invalidated).toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST))
    );

    // Untouched — guards against reverting to `checkoutQueryKeys.all`
    expect(invalidated).not.toContain(
      JSON.stringify(checkoutQueryKeys.activeSession(null, OTHER_GUEST))
    );
    expect(invalidated).not.toContain(
      JSON.stringify(checkoutQueryKeys.sessionById('session-uuid-untouched'))
    );
    expect(invalidated).not.toContain(
      JSON.stringify(wishlistQueryKeys.list(USER_ID))
    );
    expect(invalidated).not.toContain(JSON.stringify(['products', 'list']));
    expect(invalidated).not.toContain(
      JSON.stringify(cartServerQueryKeys.lines(USER_ID))
    );
  });
});

describe('integration: useGuestSession + useCheckoutSession share the same rotation contract', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });
  afterEach(() => {
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  it('rotation in useGuestSession propagates to useCheckoutSession via the guest-session:rotated event without invalidating unrelated caches', async () => {
    // Prime an expired signed session so useGuestSession rotates on mount
    seedExistingSession(OLD_GUEST, 'sig-old', Date.now() - 60_000);
    rpcMock.mockResolvedValue({
      data: {
        guest_id: NEW_GUEST,
        signature: 'sig-new',
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      },
      error: null,
    });

    const client = makeClient();
    seedRotationScenario(client);

    // Mount BOTH hooks under the same QueryClient — real app topology.
    const { result } = renderHook(
      () => {
        const guest = useGuestSession();
        const checkout = useCheckoutSession();
        return { guest, checkout };
      },
      { wrapper: wrapper(client) }
    );

    await waitFor(() => expect(result.current.guest.isInitialized).toBe(true));

    // rotate_guest_token was called once — no fallback to create_guest_token
    expect(rpcMock).toHaveBeenCalledWith('rotate_guest_token', {
      _old_guest_id: OLD_GUEST,
      _old_signature: 'sig-old',
    });
    expect(result.current.guest.guestId).toBe(NEW_GUEST);

    // Wait for the event-driven invalidation from useCheckoutSession to land
    await waitFor(() => {
      const cache = client.getQueryCache();
      expect(
        cache.find({
          queryKey: checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST),
        })?.state.isInvalidated
      ).toBe(true);
    });

    const invalidated = invalidatedKeys(client);

    // Targeted — invalidated by either useGuestSession (direct) or
    // useCheckoutSession (event handler). Both hooks converge on the same set.
    for (const key of [
      checkoutQueryKeys.activeSession(null, OLD_GUEST),
      checkoutQueryKeys.activeSession(USER_ID, OLD_GUEST),
      ['cart', 'server', 'lines', OLD_GUEST],
    ]) {
      expect(invalidated).toContain(JSON.stringify(key));
    }

    // Untouched — the contract holds end-to-end
    for (const key of [
      checkoutQueryKeys.activeSession(null, OTHER_GUEST),
      checkoutQueryKeys.sessionById('session-uuid-untouched'),
      wishlistQueryKeys.list(USER_ID),
      ['products', 'list'],
      cartServerQueryKeys.lines(USER_ID),
    ]) {
      expect(invalidated).not.toContain(JSON.stringify(key));
    }
  });

  it('fresh mint (no prior session) does not invalidate any cached query even with useCheckoutSession mounted', async () => {
    rpcMock.mockResolvedValue({
      data: {
        guest_id: NEW_GUEST,
        signature: 'sig-new',
        expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      },
      error: null,
    });

    const client = makeClient();
    seedRotationScenario(client);

    const { result } = renderHook(
      () => {
        const guest = useGuestSession();
        useCheckoutSession();
        return guest;
      },
      { wrapper: wrapper(client) }
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(rpcMock).toHaveBeenCalledWith('create_guest_token');
    expect(invalidatedKeys(client)).toEqual([]);
  });
});
