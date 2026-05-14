/**
 * Tests for usePromoCode (coupon validation + business rules).
 *
 * Prerequisites: mocked checkoutApi RPC, sonner toast, useCurrency selector.
 * Run: npx vitest run src/hooks/usePromoCode.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { validateCouponCodeRpc, toastSuccess, toastInfo } = vi.hoisted(() => ({
  validateCouponCodeRpc: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('@/services/checkoutApi', () => ({
  validateCouponCodeRpc: (...a: unknown[]) => validateCouponCodeRpc(...a),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => toastSuccess(...a),
    info: (...a: unknown[]) => toastInfo(...a),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/currencyStore', () => ({
  useCurrency: () => ({
    formatPrice: (n: number) => `${n.toFixed(2)} €`,
  }),
}));

import { usePromoCode } from './usePromoCode';

describe('usePromoCode', () => {
  beforeEach(() => {
    validateCouponCodeRpc.mockReset();
    toastSuccess.mockReset();
    toastInfo.mockReset();
  });

  it('rejects an empty code locally without calling the RPC', async () => {
    const { result } = renderHook(() => usePromoCode({ subtotal: 50 }));
    // setPromoCode('') keeps the field empty so the local zod schema rejects
    // before the network call.
    await act(async () => {
      await result.current.validateAndApply();
    });
    expect(validateCouponCodeRpc).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe('');
  });

  it('applies a percentage coupon and computes discount', async () => {
    validateCouponCodeRpc.mockResolvedValue({
      id: 'c1',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minimum_order_amount: 0,
      maximum_discount_amount: null,
    });

    const { result } = renderHook(() => usePromoCode({ subtotal: 100 }));
    act(() => result.current.setPromoCode('WELCOME10'));
    await act(async () => {
      await result.current.validateAndApply();
    });

    expect(result.current.appliedCoupon?.code).toBe('WELCOME10');
    expect(result.current.discount).toBe(10);
    expect(toastSuccess).toHaveBeenCalledWith('Code promo appliqué !');
  });

  it('caps a percentage discount at maximum_discount_amount', async () => {
    validateCouponCodeRpc.mockResolvedValue({
      id: 'c2',
      code: 'BIG50',
      type: 'percentage',
      value: 50,
      minimum_order_amount: 0,
      maximum_discount_amount: 20,
    });

    const { result } = renderHook(() => usePromoCode({ subtotal: 100 }));
    act(() => result.current.setPromoCode('BIG50'));
    await act(async () => {
      await result.current.validateAndApply();
    });
    expect(result.current.discount).toBe(20);
  });

  it('refuses a coupon whose minimum_order_amount is not met', async () => {
    validateCouponCodeRpc.mockResolvedValue({
      id: 'c3',
      code: 'FREESHIP',
      type: 'fixed',
      value: 5,
      minimum_order_amount: 200,
      maximum_discount_amount: null,
      includes_free_shipping: true,
    });

    const { result } = renderHook(() => usePromoCode({ subtotal: 50 }));
    act(() => result.current.setPromoCode('FREESHIP'));
    await act(async () => {
      await result.current.validateAndApply();
    });

    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.error).toMatch(/Commande minimum/);
  });

  it('reports an invalid code when the RPC returns null', async () => {
    validateCouponCodeRpc.mockResolvedValue(null);

    const { result } = renderHook(() => usePromoCode({ subtotal: 100 }));
    act(() => result.current.setPromoCode('NOPE12'));
    await act(async () => {
      await result.current.validateAndApply();
    });

    expect(result.current.appliedCoupon).toBeNull();
    expect(result.current.error).toMatch(/invalide|expir/i);
  });

  it('remove() clears the applied coupon and notifies the user', async () => {
    validateCouponCodeRpc.mockResolvedValue({
      id: 'c1',
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minimum_order_amount: 0,
      maximum_discount_amount: null,
    });
    const { result } = renderHook(() => usePromoCode({ subtotal: 100 }));
    act(() => result.current.setPromoCode('WELCOME10'));
    await act(async () => {
      await result.current.validateAndApply();
    });

    act(() => result.current.remove());
    expect(result.current.appliedCoupon).toBeNull();
    expect(toastInfo).toHaveBeenCalledWith('Code promo retiré');
  });

  it('exposes hasFreeShipping when the coupon includes it', async () => {
    validateCouponCodeRpc.mockResolvedValue({
      id: 'c4',
      code: 'SHIPFREE',
      type: 'fixed',
      value: 0,
      minimum_order_amount: 0,
      maximum_discount_amount: null,
      includes_free_shipping: true,
    });
    const { result } = renderHook(() => usePromoCode({ subtotal: 100 }));
    act(() => result.current.setPromoCode('SHIPFREE'));
    await act(async () => {
      await result.current.validateAndApply();
    });
    expect(result.current.hasFreeShipping).toBe(true);
  });
});
