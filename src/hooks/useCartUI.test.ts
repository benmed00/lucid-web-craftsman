/**
 * Tests for useCartUI (selector over the Zustand cart store).
 *
 * Prerequisites: `@/stores` is mocked so we can control the cart shape directly.
 * Run: npx vitest run src/hooks/useCartUI.test.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

type CartFacade = {
  itemCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  pendingOperations: number;
};

const { useCartFn } = vi.hoisted(() => ({
  useCartFn: vi.fn<() => CartFacade>(),
}));

vi.mock('@/stores', () => ({
  useCart: () => useCartFn(),
}));

import { useCartUI } from './useCartUI';

describe('useCartUI', () => {
  it('returns muted styling and zero count for an empty cart', () => {
    useCartFn.mockReturnValue({
      itemCount: 0,
      isSyncing: false,
      isOnline: true,
      pendingOperations: 0,
    });

    const { result } = renderHook(() => useCartUI());
    expect(result.current.itemCount).toBe(0);
    expect(result.current.cartColor).toBe('bg-muted');
    expect(result.current.badgeTextColor).toBe('text-muted-foreground');
  });

  it('uses the primary token when the cart has items', () => {
    useCartFn.mockReturnValue({
      itemCount: 2,
      isSyncing: true,
      isOnline: false,
      pendingOperations: 3,
    });

    const { result } = renderHook(() => useCartUI());
    expect(result.current.itemCount).toBe(2);
    expect(result.current.cartColor).toBe('bg-primary');
    expect(result.current.badgeTextColor).toBe('text-primary');
    expect(result.current.isSyncing).toBe(true);
    expect(result.current.isOnline).toBe(false);
    expect(result.current.pendingOperations).toBe(3);
  });
});
