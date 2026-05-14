/**
 * useOptimizedQuery / useOptimizedProducts / useOptimizedOrders
 *
 * Prerequisites: mocked productService + orderService; UnifiedCache cleared between tests.
 * Run: npx vitest run src/hooks/useOptimizedData.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { fetchActiveProductsRaw, fetchUserOrdersWithShipmentsAndItems } =
  vi.hoisted(() => ({
    fetchActiveProductsRaw: vi.fn(),
    fetchUserOrdersWithShipmentsAndItems: vi.fn(),
  }));

vi.mock('@/services/productService', () => ({
  fetchActiveProductsRaw: (...a: unknown[]) => fetchActiveProductsRaw(...a),
}));

vi.mock('@/services/orderService', () => ({
  fetchUserOrdersWithShipmentsAndItems: (...a: unknown[]) =>
    fetchUserOrdersWithShipmentsAndItems(...a),
}));

import {
  useOptimizedQuery,
  useOptimizedProducts,
  useOptimizedOrders,
  cacheUtils,
} from './useOptimizedData';

beforeEach(() => {
  vi.clearAllMocks();
  cacheUtils.clear();
});

afterEach(() => {
  cacheUtils.clear();
});

describe('useOptimizedQuery', () => {
  it('loads data via queryFn and exposes refetch', async () => {
    const queryFn = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useOptimizedQuery('test-key-opt', queryFn, {
        enableCache: false,
        retry: 0,
      })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ ok: true });
    expect(queryFn).toHaveBeenCalledTimes(1);

    queryFn.mockResolvedValue({ ok: false });
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() =>
      expect(result.current.data).toEqual({ ok: false })
    );
  });
});

describe('useOptimizedProducts', () => {
  it('delegates to product service', async () => {
    fetchActiveProductsRaw.mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() =>
      useOptimizedProducts({ category: 'hats' })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchActiveProductsRaw).toHaveBeenCalled();
    expect(result.current.data).toEqual([{ id: 1 }]);
  });
});

describe('useOptimizedOrders', () => {
  it('returns empty list when userId is undefined', async () => {
    const { result } = renderHook(() => useOptimizedOrders(undefined));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(fetchUserOrdersWithShipmentsAndItems).not.toHaveBeenCalled();
  });

  it('fetches orders when userId is set', async () => {
    fetchUserOrdersWithShipmentsAndItems.mockResolvedValue([{ id: 'o1' }]);
    const { result } = renderHook(() => useOptimizedOrders('user-99'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchUserOrdersWithShipmentsAndItems).toHaveBeenCalledWith('user-99');
    expect(result.current.data).toEqual([{ id: 'o1' }]);
  });
});
