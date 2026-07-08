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

    // Untouched — the contract holds end-to-end. Includes root-gate stress:
    // wishlist / products keys that literally contain the rotated guest_id
    // must NOT be invalidated because their root is neither 'checkout' nor 'cart'.
    for (const key of [
      checkoutQueryKeys.activeSession(null, OTHER_GUEST),
      checkoutQueryKeys.sessionById('session-uuid-untouched'),
      wishlistQueryKeys.list(USER_ID),
      ['products', 'list'],
      cartServerQueryKeys.lines(USER_ID),
      ['wishlist', OLD_GUEST],
      ['wishlist', NEW_GUEST],
      ['products', 'by-guest', OLD_GUEST],
      ['products', 'by-guest', NEW_GUEST],
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

describe('integration: sequential guest rotations invalidate the right slice at every step', () => {
  const GUEST_A = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const GUEST_B = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const GUEST_C = '33333333-cccc-4ccc-8ccc-cccccccccccc';
  const UNRELATED = '99999999-eeee-4eee-8eee-eeeeeeeeeeee';

  beforeEach(() => {
    rpcMock.mockReset();
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });
  afterEach(() => {
    safeRemoveItem(GUEST_SESSION_KEY, { storage: 'localStorage' });
  });

  it('A → B → C: each rotation only invalidates caches keyed by the pair that just rotated', async () => {
    const client = makeClient();

    // Cache entries for every guest that ever existed in this scenario,
    // plus an unrelated guest that must survive all three rotations.
    const seedFor = (g: string) => {
      client.setQueryData(checkoutQueryKeys.activeSession(null, g), { g });
      client.setQueryData(['cart', 'server', 'lines', g], [{ g }]);
      // Root-gate stress: wishlist / products keys that literally embed the
      // guest_id. These must NEVER be invalidated by a guest rotation because
      // their root is neither 'checkout' nor 'cart'.
      client.setQueryData(['wishlist', g], [{ g }]);
      client.setQueryData(['products', 'by-guest', g], [{ g }]);
      client.setQueryData(['orders', 'by-guest', g], [{ g }]);
    };
    seedFor(GUEST_A);
    seedFor(GUEST_B);
    seedFor(GUEST_C);
    seedFor(UNRELATED);
    // Non-guest-scoped keys that must stay untouched across the whole run
    client.setQueryData(wishlistQueryKeys.list('u'), [1]);
    client.setQueryData(['products', 'list'], [1]);

    const resetInvalidationFlags = () => {
      // Re-materialize each query to clear its `isInvalidated` flag between steps
      for (const q of client.getQueryCache().getAll()) {
        client.setQueryData(q.queryKey, q.state.data);
      }
    };

    const runRotationStep = async (
      fromGuest: string,
      toGuest: string,
      label: string
    ) => {
      // Prime an expired signed session for `fromGuest` and stub RPC to return `toGuest`
      seedExistingSession(fromGuest, `sig-${label}`, Date.now() - 60_000);
      rpcMock.mockResolvedValue({
        data: {
          guest_id: toGuest,
          signature: `sig-${label}-new`,
          expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        },
        error: null,
      });

      const { unmount, result } = renderHook(
        () => {
          const guest = useGuestSession();
          useCheckoutSession();
          return guest;
        },
        { wrapper: wrapper(client) }
      );

      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      await waitFor(() => expect(result.current.guestId).toBe(toGuest));

      // Wait for the event-driven invalidation from useCheckoutSession to land
      await waitFor(() => {
        expect(
          client
            .getQueryCache()
            .find({
              queryKey: checkoutQueryKeys.activeSession(null, fromGuest),
            })
            ?.state.isInvalidated
        ).toBe(true);
      });

      const invalidated = invalidatedKeys(client);

      // MUST be invalidated: only the pair (fromGuest, toGuest)
      expect(invalidated).toContain(
        JSON.stringify(checkoutQueryKeys.activeSession(null, fromGuest))
      );
      expect(invalidated).toContain(
        JSON.stringify(checkoutQueryKeys.activeSession(null, toGuest))
      );
      expect(invalidated).toContain(
        JSON.stringify(['cart', 'server', 'lines', fromGuest])
      );
      expect(invalidated).toContain(
        JSON.stringify(['cart', 'server', 'lines', toGuest])
      );

      // MUST NOT be invalidated: any guest not in the current pair, plus
      // all non-checkout/cart keys.
      const untouchedGuests = [GUEST_A, GUEST_B, GUEST_C, UNRELATED].filter(
        (g) => g !== fromGuest && g !== toGuest
      );
      for (const g of untouchedGuests) {
        expect(invalidated).not.toContain(
          JSON.stringify(checkoutQueryKeys.activeSession(null, g))
        );
        expect(invalidated).not.toContain(
          JSON.stringify(['cart', 'server', 'lines', g])
        );
      }
      expect(invalidated).not.toContain(
        JSON.stringify(wishlistQueryKeys.list('u'))
      );
      expect(invalidated).not.toContain(JSON.stringify(['products', 'list']));

      // Root-gate assertion: wishlist / products / orders keys that embed
      // the rotated guest_id must NEVER refetch — even for the pair that
      // just rotated. Assert for EVERY guest in the scenario at every step.
      for (const g of [GUEST_A, GUEST_B, GUEST_C, UNRELATED]) {
        expect(invalidated).not.toContain(JSON.stringify(['wishlist', g]));
        expect(invalidated).not.toContain(
          JSON.stringify(['products', 'by-guest', g])
        );
        expect(invalidated).not.toContain(
          JSON.stringify(['orders', 'by-guest', g])
        );
      }

      unmount();
      resetInvalidationFlags();
      rpcMock.mockReset();
    };

    // Chain three sequential rotations: A→B, B→C, C→A (loop-back).
    await runRotationStep(GUEST_A, GUEST_B, 'a-to-b');
    await runRotationStep(GUEST_B, GUEST_C, 'b-to-c');
    await runRotationStep(GUEST_C, GUEST_A, 'c-to-a');

    // Sanity: the unrelated guest and the non-checkout/cart keys still have data
    expect(
      client.getQueryData(checkoutQueryKeys.activeSession(null, UNRELATED))
    ).toEqual({ g: UNRELATED });
    expect(client.getQueryData(wishlistQueryKeys.list('u'))).toEqual([1]);
    expect(client.getQueryData(['products', 'list'])).toEqual([1]);
  });

  it('no rotation (valid session, guest_id unchanged): zero checkout/cart invalidations, even for pre-seeded old/new guest keys', async () => {
    // Prime a still-valid signed session for GUEST_A — must NOT trigger rotation
    seedExistingSession(GUEST_A, 'sig-valid', Date.now() + 24 * 3600_000);

    const client = makeClient();

    // Seed caches for BOTH the current guest (GUEST_A) and a hypothetical
    // "new" guest (GUEST_B) that a rotation would have targeted. Neither
    // must be invalidated because no rotation event fires.
    const seedFor = (g: string) => {
      client.setQueryData(checkoutQueryKeys.activeSession(null, g), { g });
      client.setQueryData(checkoutQueryKeys.activeSession(USER_ID, g), { g, u: USER_ID });
      client.setQueryData(['cart', 'server', 'lines', g], [{ g }]);
    };
    seedFor(GUEST_A);
    seedFor(GUEST_B);
    seedFor(UNRELATED);
    client.setQueryData(wishlistQueryKeys.list('u'), [1]);
    client.setQueryData(['products', 'list'], [1]);

    const rotatedEvents: unknown[] = [];
    const listener = (e: Event) => rotatedEvents.push((e as CustomEvent).detail);
    window.addEventListener('guest-session:rotated', listener);

    try {
      const { result } = renderHook(
        () => {
          const guest = useGuestSession();
          useCheckoutSession();
          return guest;
        },
        { wrapper: wrapper(client) }
      );

      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      // Contract: session was valid → NO RPC call, guest_id unchanged, no event
      expect(rpcMock).not.toHaveBeenCalled();
      expect(result.current.guestId).toBe(GUEST_A);
      expect(rotatedEvents).toEqual([]);

      // Give any hypothetical async invalidation a tick to (not) happen
      await new Promise((r) => setTimeout(r, 20));

      // Zero invalidations — including for GUEST_A and GUEST_B keys
      expect(invalidatedKeys(client)).toEqual([]);
    } finally {
      window.removeEventListener('guest-session:rotated', listener);
    }
  });

  it('single rotation event: exactly one invalidation per target guest_id even across many rerenders', async () => {
    const client = makeClient();

    // Seed both old and new guest caches so invalidateQueries has real targets
    client.setQueryData(checkoutQueryKeys.activeSession(null, GUEST_A), { g: GUEST_A });
    client.setQueryData(['cart', 'server', 'lines', GUEST_A], [{ g: GUEST_A }]);
    client.setQueryData(checkoutQueryKeys.activeSession(null, GUEST_B), { g: GUEST_B });
    client.setQueryData(['cart', 'server', 'lines', GUEST_B], [{ g: GUEST_B }]);

    // Spy on the QueryClient's invalidateQueries to count calls per guest target
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { rerender, result } = renderHook(
      ({ tick: _tick }: { tick: number }) => {
        const guest = useGuestSession();
        useCheckoutSession();
        return guest;
      },
      { wrapper: wrapper(client), initialProps: { tick: 0 } }
    );

    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    // Rerender many times BEFORE the rotation event — the event handler
    // must not be re-invoked per render.
    for (let i = 1; i <= 5; i++) rerender({ tick: i });

    // Fire the rotation event exactly ONCE
    window.dispatchEvent(
      new CustomEvent('guest-session:rotated', {
        detail: { oldGuestId: GUEST_A, newGuestId: GUEST_B },
      })
    );

    await waitFor(() => {
      expect(
        client
          .getQueryCache()
          .find({ queryKey: checkoutQueryKeys.activeSession(null, GUEST_A) })
          ?.state.isInvalidated
      ).toBe(true);
    });

    // Rerender AGAIN after the event — a re-run of the effect would
    // duplicate the invalidateQueries calls; the contract forbids it.
    for (let i = 6; i <= 10; i++) rerender({ tick: i });
    await new Promise((r) => setTimeout(r, 20));

    // Count invalidateQueries calls that target GUEST_A or GUEST_B via a predicate.
    // The hook fires ONE invalidateQueries per guest id (old + new) per rotation.
    const guestScopedCalls = invalidateSpy.mock.calls.filter(([arg]) => {
      const filters = arg as { predicate?: unknown } | undefined;
      return typeof filters?.predicate === 'function';
    });

    // Exactly 2 guest-scoped invalidations: one for GUEST_A, one for GUEST_B.
    // NOT 2 * (1 + rerenders).
    expect(guestScopedCalls.length).toBe(2);

    // Structural check: both invalidations landed on the seeded caches only once each
    const cache = client.getQueryCache();
    const oldQ = cache.find({ queryKey: checkoutQueryKeys.activeSession(null, GUEST_A) });
    const newQ = cache.find({ queryKey: checkoutQueryKeys.activeSession(null, GUEST_B) });
    expect(oldQ?.state.isInvalidated).toBe(true);
    expect(newQ?.state.isInvalidated).toBe(true);

    invalidateSpy.mockRestore();
  });
});
