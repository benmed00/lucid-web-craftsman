/**
 * useWishlist: cloud vs elevated local wishlist paths.
 *
 * Prerequisites: mocked auth, cart sync policy, wishlist API, business rules, sonner.
 * Run: npx vitest run src/hooks/useWishlist.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  useAuthMock,
  fetchWishlistForUser,
  subscribeWishlistChanges,
  removeWishlistChannel,
  insertWishlistItem,
  deleteWishlistItem,
  toastSuccess,
  toastError,
  toastWarning,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  fetchWishlistForUser: vi.fn(),
  subscribeWishlistChanges: vi.fn(() => 'ch-mock'),
  removeWishlistChannel: vi.fn(),
  insertWishlistItem: vi.fn(),
  deleteWishlistItem: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useOptimizedAuth: () => useAuthMock(),
}));

vi.mock('@/lib/cart/cartSyncPolicy', () => ({
  resolveCartSyncPolicy: vi.fn().mockResolvedValue(undefined),
  isWishlistCloudSyncAllowed: vi.fn(() => true),
  isElevatedStorefrontUser: vi.fn(() => false),
}));

vi.mock('@/hooks/useBusinessRules', () => ({
  getBusinessRules: () => ({
    cart: {
      maxQuantityPerItem: 10,
      maxProductTypes: 10,
      highValueThreshold: 1000,
      minOrderAmount: 0,
      maxOrderAmount: 10000,
    },
    wishlist: { maxItems: 10 },
    checkout: {
      requireEmailVerification: false,
      allowGuestCheckout: true,
      showVipContactForHighValue: true,
    },
    contact: { vipEmail: 'vip@example.com', vipPhone: '+3300000000' },
  }),
}));

vi.mock('@/services/wishlistApi', () => ({
  fetchWishlistForUser: (...a: unknown[]) => fetchWishlistForUser(...a),
  subscribeWishlistChanges: (...a: unknown[]) => subscribeWishlistChanges(...a),
  removeWishlistChannel: (...a: unknown[]) => removeWishlistChannel(...a),
  insertWishlistItem: (...a: unknown[]) => insertWishlistItem(...a),
  deleteWishlistItem: (...a: unknown[]) => deleteWishlistItem(...a),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    error: (...a: unknown[]) => toastError(...a),
    warning: (...a: unknown[]) => toastWarning(...a),
  },
}));

import { useWishlist } from './useWishlist';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: { id: 'user-wl-1', email: 'u@test.com' } });
  fetchWishlistForUser.mockResolvedValue([]);
});

describe('useWishlist', () => {
  it('loads empty wishlist for authenticated cloud-sync user', async () => {
    const { result } = renderHook(() => useWishlist(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.wishlistCount).toBe(0);
    expect(fetchWishlistForUser).toHaveBeenCalledWith('user-wl-1');
    expect(subscribeWishlistChanges).toHaveBeenCalledWith(
      'user-wl-1',
      expect.any(Function)
    );
  });

  it('addToWishlist calls insertWishlistItem when cloud sync is allowed', async () => {
    insertWishlistItem.mockResolvedValue({
      id: 'row-1',
      user_id: 'user-wl-1',
      product_id: 42,
      created_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useWishlist(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addToWishlist(42);
    });

    expect(insertWishlistItem).toHaveBeenCalledWith('user-wl-1', 42);
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('returns false when unauthenticated', async () => {
    useAuthMock.mockReturnValue({ user: null });
    const { result } = renderHook(() => useWishlist(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ok = await act(async () => result.current.addToWishlist(1));
    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalled();
    expect(insertWishlistItem).not.toHaveBeenCalled();
  });
});
