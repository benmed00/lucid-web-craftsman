/**
 * Tests for useBusinessRules (defaults + DB merge + module-level cache).
 *
 * Prerequisites: mocked `@/services/appSettingsApi`; the test clears the
 * module-level cache between cases via `clearBusinessRulesCache`.
 * Run: npx vitest run src/hooks/useBusinessRules.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const { fetchAppSettingValueByKey } = vi.hoisted(() => ({
  fetchAppSettingValueByKey: vi.fn(),
}));

vi.mock('@/services/appSettingsApi', () => ({
  fetchAppSettingValueByKey: (...a: unknown[]) =>
    fetchAppSettingValueByKey(...a),
}));

import {
  useBusinessRules,
  getBusinessRules,
  clearBusinessRulesCache,
} from './useBusinessRules';

describe('useBusinessRules', () => {
  beforeEach(() => {
    clearBusinessRulesCache();
    fetchAppSettingValueByKey.mockReset();
  });

  it('merges DB values with the defaults', async () => {
    fetchAppSettingValueByKey.mockResolvedValue({
      cart: { maxQuantityPerItem: 25 },
      wishlist: { maxItems: 42 },
    });

    const { result } = renderHook(() => useBusinessRules());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rules.cart.maxQuantityPerItem).toBe(25);
    expect(result.current.rules.cart.highValueThreshold).toBe(1000);
    expect(result.current.rules.wishlist.maxItems).toBe(42);
    expect(result.current.rules.checkout.allowGuestCheckout).toBe(true);
  });

  it('returns defaults when fetch throws', async () => {
    fetchAppSettingValueByKey.mockRejectedValue(new Error('rls'));

    const { result } = renderHook(() => useBusinessRules());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rules.cart.maxQuantityPerItem).toBe(10);
  });

  it('refetch clears the cache and re-runs the service call', async () => {
    fetchAppSettingValueByKey.mockResolvedValueOnce({
      cart: { maxQuantityPerItem: 5 },
    });
    fetchAppSettingValueByKey.mockResolvedValueOnce({
      cart: { maxQuantityPerItem: 50 },
    });

    const { result } = renderHook(() => useBusinessRules());
    await waitFor(() =>
      expect(result.current.rules.cart.maxQuantityPerItem).toBe(5)
    );

    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.rules.cart.maxQuantityPerItem).toBe(50);
  });

  it('getBusinessRules sync accessor returns defaults before fetch and cached after', async () => {
    expect(getBusinessRules().cart.maxQuantityPerItem).toBe(10);

    fetchAppSettingValueByKey.mockResolvedValue({
      cart: { maxQuantityPerItem: 33 },
    });
    const { result } = renderHook(() => useBusinessRules());
    await waitFor(() =>
      expect(result.current.rules.cart.maxQuantityPerItem).toBe(33)
    );
    expect(getBusinessRules().cart.maxQuantityPerItem).toBe(33);
  });
});
