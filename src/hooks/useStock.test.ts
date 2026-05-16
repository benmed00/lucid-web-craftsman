/**
 * Tests for useStock (single and batch variants over stockService).
 *
 * Prerequisites: mocks `@/services/stockService` so the hook never touches
 * Supabase; uses fake timers for the 50 ms debounce.
 * Run: npx vitest run src/hooks/useStock.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  getStockInfo,
  getMultipleStockInfo,
  canOrderQuantity,
  reserveStock,
  updateStock,
} = vi.hoisted(() => ({
  getStockInfo: vi.fn(),
  getMultipleStockInfo: vi.fn(),
  canOrderQuantity: vi.fn(),
  reserveStock: vi.fn(),
  updateStock: vi.fn(),
}));

vi.mock('@/services/stockService', () => ({
  stockService: {
    getStockInfo: (...a: unknown[]) => getStockInfo(...a),
    getMultipleStockInfo: (...a: unknown[]) => getMultipleStockInfo(...a),
    canOrderQuantity: (...a: unknown[]) => canOrderQuantity(...a),
    reserveStock: (...a: unknown[]) => reserveStock(...a),
    updateStock: (...a: unknown[]) => updateStock(...a),
  },
  StockInfo: {},
}));

import { useStock } from './useStock';

describe('useStock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getStockInfo.mockReset();
    getMultipleStockInfo.mockReset();
    canOrderQuantity.mockReset();
    reserveStock.mockReset();
    updateStock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches single-product stock after the 50 ms debounce', async () => {
    const info = {
      available: 5,
      isLow: false,
      isOutOfStock: false,
      canOrder: true,
      maxQuantity: 5,
    };
    getStockInfo.mockResolvedValue(info);

    const { result } = renderHook(() => useStock({ productId: 7 }));
    expect(result.current.loading).toBe(false);

    // advanceTimersByTimeAsync flushes both timers and microtasks so the
    // awaited service call resolves before we assert.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    expect(result.current.stockInfo).toEqual(info);
    expect(getStockInfo).toHaveBeenCalledWith(7);
  });

  it('fetches batched stock info when productIds is provided', async () => {
    const map = {
      1: {
        available: 3,
        isLow: false,
        isOutOfStock: false,
        canOrder: true,
        maxQuantity: 3,
      },
      2: {
        available: 0,
        isLow: false,
        isOutOfStock: true,
        canOrder: false,
        maxQuantity: 0,
      },
    };
    getMultipleStockInfo.mockResolvedValue(map);

    // Stable ref so the hook's productIds dep does not thrash the debounce timer
    const stableIds = [1, 2];
    const { result } = renderHook(
      ({ productIds }) => useStock({ productIds }),
      { initialProps: { productIds: stableIds } }
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });
    expect(result.current.stockInfo).toEqual(map);
    expect(getMultipleStockInfo).toHaveBeenCalledWith([1, 2]);
  });

  it('skips fetching when enabled=false', async () => {
    const { result } = renderHook(() =>
      useStock({ productId: 1, enabled: false })
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(getStockInfo).not.toHaveBeenCalled();
    expect(result.current.stockInfo).toBeNull();
  });

  it('captures errors raised by the service', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    getStockInfo.mockRejectedValue(new Error('rls denied'));

    const { result } = renderHook(() => useStock({ productId: 1 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
    });

    expect(result.current.error).toBe('rls denied');
    expect(result.current.stockInfo).toBeNull();
    consoleErr.mockRestore();
  });

  it('exposes canOrderQuantity / reserveStock / updateStock pass-throughs', async () => {
    canOrderQuantity.mockResolvedValue({ canOrder: true });
    reserveStock.mockResolvedValue({ success: true });
    updateStock.mockResolvedValue(undefined);
    getStockInfo.mockResolvedValue({
      available: 2,
      isLow: false,
      isOutOfStock: false,
      canOrder: true,
      maxQuantity: 2,
    });

    const { result } = renderHook(() => useStock({ productId: 1 }));

    let canOrder;
    await act(async () => {
      canOrder = await result.current.canOrderQuantity(1, 2);
    });
    expect(canOrder).toEqual({ canOrder: true });

    let reserve;
    await act(async () => {
      reserve = await result.current.reserveStock([
        { productId: 1, quantity: 2 },
      ]);
    });
    expect(reserve).toEqual({ success: true });

    await act(async () => {
      await result.current.updateStock({
        productId: 1,
        quantity: 1,
        type: 'add',
      });
    });
    expect(updateStock).toHaveBeenCalled();
  });
});
