/**
 * useCartSyncListeners + useDebouncedCartSave
 *
 * Prerequisites: mocked cartApi, cart sync policy, sonner, safeStorage spy for debounced save.
 * Run: npx vitest run src/hooks/useCartSync.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { onAuthStateChange, getAuthUser } = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  getAuthUser: vi.fn(),
}));

vi.mock('@/services/cartApi', () => ({
  onAuthStateChange: (...a: unknown[]) => onAuthStateChange(...a),
  getAuthUser: (...a: unknown[]) => getAuthUser(...a),
}));

vi.mock('@/lib/cart/cartSyncPolicy', () => ({
  isSupabaseCartSyncAllowed: () => true,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import * as safeStorage from '@/lib/storage/safeStorage';
import { useCartSyncListeners, useDebouncedCartSave } from './useCartSync';
import type { CartItem } from './useCartSync';

describe('useCartSyncListeners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('notifies onOnlineChange when the browser goes online', () => {
    const onOnline = vi.fn();
    const onAuth = vi.fn();
    renderHook(() => useCartSyncListeners(onOnline, onAuth));

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(onOnline).toHaveBeenCalledWith(true);
  });

  it('notifies onOnlineChange false when offline', () => {
    const onOnline = vi.fn();
    const onAuth = vi.fn();
    renderHook(() => useCartSyncListeners(onOnline, onAuth));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(onOnline).toHaveBeenCalledWith(false);
  });
});

describe('useDebouncedCartSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getAuthUser.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists to safe storage for guests after delay', async () => {
    const spy = vi
      .spyOn(safeStorage, 'safeSetItem')
      .mockImplementation(() => true);
    const items: CartItem[] = [
      {
        id: 1,
        quantity: 1,
        product: {
          id: 1,
          name: 'p',
          price: 1,
          images: [],
          category: 'c',
          description: '',
          details: '',
          care: '',
          artisan: 'a',
        },
      },
    ];

    const { result } = renderHook(() =>
      useDebouncedCartSave(items, true, true, 300)
    );

    act(() => {
      void result.current();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
