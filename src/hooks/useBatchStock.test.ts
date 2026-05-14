/**
 * Tests for useBatchStock.
 *
 * Prerequisites: mocked stockService. Async tests use **real timers** + `waitFor`
 * because the hook debounces with `setTimeout` then awaits a Promise; Vitest fake
 * timers + `advanceTimersByTimeAsync` can hang waiting on unresolved microtasks.
 * The hook depends on `productIds` by reference in its effect, so use stable
 * array references with `initialProps`.
 * Run: npx vitest run src/hooks/useBatchStock.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { getMultipleStockInfo } = vi.hoisted(() => ({
  getMultipleStockInfo: vi.fn(),
}));

vi.mock('@/services/stockService', () => ({
  stockService: {
    getMultipleStockInfo: (...a: unknown[]) => getMultipleStockInfo(...a),
  },
  StockInfo: {},
}));

import { useBatchStock } from './useBatchStock';

describe('useBatchStock', () => {
  beforeEach(() => {
    getMultipleStockInfo.mockReset();
  });

  it('returns an empty map when productIds is empty', () => {
    const emptyIds: number[] = [];
    const { result } = renderHook(({ productIds }) =>
      useBatchStock({ productIds }), { initialProps: { productIds: emptyIds } }
    );
    expect(result.current.stockMap).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(getMultipleStockInfo).not.toHaveBeenCalled();
  });

  it('fetches once after the debounce and exposes the map', async () => {
    const map = {
      1: {
        available: 5,
        isLow: false,
        isOutOfStock: false,
        canOrder: true,
        maxQuantity: 5,
      },
    };
    getMultipleStockInfo.mockResolvedValue(map);

    const stableIds = [1];
    const { result } = renderHook(
      ({ productIds }) => useBatchStock({ productIds }),
      { initialProps: { productIds: stableIds } }
    );

    await waitFor(() => {
      expect(result.current.stockMap).toEqual(map);
    });
    expect(getMultipleStockInfo).toHaveBeenCalledWith([1]);
  });

  it('skips fetch when enabled=false', async () => {
    const stableIds = [1];
    renderHook(
      ({ productIds, enabled }) => useBatchStock({ productIds, enabled }),
      { initialProps: { productIds: stableIds, enabled: false } }
    );
    await new Promise((r) => setTimeout(r, 200));
    expect(getMultipleStockInfo).not.toHaveBeenCalled();
  });

  it('surfaces service errors', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    getMultipleStockInfo.mockRejectedValue(new Error('rls'));

    const stableIds = [1];
    const { result } = renderHook(
      ({ productIds }) => useBatchStock({ productIds }),
      { initialProps: { productIds: stableIds } }
    );

    await waitFor(() => {
      expect(result.current.error).toBe('rls');
    });
    consoleErr.mockRestore();
  });
});
