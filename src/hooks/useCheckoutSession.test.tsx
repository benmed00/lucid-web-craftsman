/**
 * useCheckoutSession: guest/user session hydration and elevated (in-memory) mode.
 *
 * Prerequisites: mocked checkoutApi, guest session, auth, cart sync policy;
 * QueryClientProvider wrapper.
 * Run: npx vitest run src/hooks/useCheckoutSession.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  fetchActiveCheckoutSessionByGuestId,
  fetchActiveCheckoutSessionByUserId,
  insertCheckoutSession,
  updateCheckoutSessionRow,
  signOutLocalScope,
  useGuestSessionMock,
  useAuthMock,
  isElevatedMock,
  resolvePolicyMock,
} = vi.hoisted(() => ({
  fetchActiveCheckoutSessionByGuestId: vi.fn(),
  fetchActiveCheckoutSessionByUserId: vi.fn(),
  insertCheckoutSession: vi.fn(),
  updateCheckoutSessionRow: vi.fn(),
  signOutLocalScope: vi.fn(),
  useGuestSessionMock: vi.fn(),
  useAuthMock: vi.fn(),
  isElevatedMock: vi.fn(() => false),
  resolvePolicyMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/checkoutApi', () => ({
  fetchActiveCheckoutSessionByGuestId: (...a: unknown[]) =>
    fetchActiveCheckoutSessionByGuestId(...a),
  fetchActiveCheckoutSessionByUserId: (...a: unknown[]) =>
    fetchActiveCheckoutSessionByUserId(...a),
  insertCheckoutSession: (...a: unknown[]) => insertCheckoutSession(...a),
  updateCheckoutSessionRow: (...a: unknown[]) => updateCheckoutSessionRow(...a),
  signOutLocalScope: (...a: unknown[]) => signOutLocalScope(...a),
}));

vi.mock('@/hooks/useGuestSession', () => ({
  useGuestSession: () => useGuestSessionMock(),
}));

vi.mock('@/context/AuthContext', () => ({
  useOptimizedAuth: () => useAuthMock(),
}));

vi.mock('@/lib/cart/cartSyncPolicy', () => ({
  resolveCartSyncPolicy: (...a: unknown[]) => resolvePolicyMock(...a),
  isElevatedStorefrontUser: () => isElevatedMock(),
}));

import { useCheckoutSession } from './useCheckoutSession';

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  isElevatedMock.mockReturnValue(false);
  resolvePolicyMock.mockResolvedValue(undefined);
  useAuthMock.mockReturnValue({ user: null });
  useGuestSessionMock.mockReturnValue({
    isInitialized: true,
    getSessionData: () => ({
      guest_id: 'guest-session-uuid',
      device_type: 'desktop',
      os: 'test-os',
      browser: 'test-browser',
    }),
  });
  fetchActiveCheckoutSessionByGuestId.mockResolvedValue(null);
  fetchActiveCheckoutSessionByUserId.mockResolvedValue(null);
});

describe('useCheckoutSession', () => {
  it('hydrates an in-memory session when no DB row exists (guest)', async () => {
    const { result } = renderHook(() => useCheckoutSession(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.getSessionData()).not.toBeNull();
    });
    expect(result.current.sessionId).toBeNull();
    const data = result.current.getSessionData();
    expect(data?.guest_id).toBe('guest-session-uuid');
    expect(data?.current_step).toBe(1);
    expect(fetchActiveCheckoutSessionByGuestId).toHaveBeenCalledWith(
      'guest-session-uuid'
    );
  });

  it('hydrates from an existing checkout_sessions row when fetch returns data', async () => {
    fetchActiveCheckoutSessionByGuestId.mockResolvedValue({
      id: 'row-1',
      guest_id: 'guest-session-uuid',
      user_id: null,
      current_step: 2,
      last_completed_step: 1,
      status: 'in_progress',
      personal_info: null,
      shipping_info: null,
      promo_code: null,
      promo_code_valid: null,
      promo_discount_type: null,
      promo_discount_value: null,
      promo_discount_applied: null,
      promo_free_shipping: false,
      cart_items: null,
      subtotal: 0,
      shipping_cost: 0,
      total: 0,
      order_id: null,
    });

    const { result } = renderHook(() => useCheckoutSession(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.sessionId).toBe('row-1'));
    expect(result.current.getSessionData()?.id).toBe('row-1');
    expect(result.current.getSessionData()?.current_step).toBe(2);
  });

  it('uses in-memory-only session for elevated storefront users', async () => {
    isElevatedMock.mockReturnValue(true);

    const { result } = renderHook(() => useCheckoutSession(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.getSessionData()).not.toBeNull();
    });
    expect(result.current.sessionId).toBeNull();
    expect(fetchActiveCheckoutSessionByGuestId).not.toHaveBeenCalled();
    expect(fetchActiveCheckoutSessionByUserId).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.savePersonalInfo({
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
      });
    });

    expect(insertCheckoutSession).not.toHaveBeenCalled();
    expect(updateCheckoutSessionRow).not.toHaveBeenCalled();
    expect(result.current.getSessionData()?.personal_info).toMatchObject({
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
    });
  });

  it('creates a DB row on first persist when not elevated', async () => {
    insertCheckoutSession.mockResolvedValue({ id: 'new-sess' });
    updateCheckoutSessionRow.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCheckoutSession(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.getSessionData()).not.toBeNull());

    await act(async () => {
      await result.current.savePersonalInfo({
        first_name: 'Grace',
        last_name: 'Hopper',
        email: 'grace@example.com',
      });
    });

    expect(insertCheckoutSession).toHaveBeenCalled();
    expect(updateCheckoutSessionRow).toHaveBeenCalled();
  });
});
