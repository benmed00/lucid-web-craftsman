/**
 * Pure checkout totals used by `useCheckoutPage` (display + payment payload hints).
 *
 * Run: `npx vitest run src/hooks/checkout/checkoutPageTotals.test.ts`
 */
import { describe, expect, it } from 'vitest';

import { computeCheckoutTotals } from '@/hooks/checkout/checkoutPageTotals';
import type { SavedCoupon } from '@/hooks/useCheckoutFormPersistence';

const baseProduct = { id: 1, name: 'Test', price: 50, images: [] as string[] };

describe('computeCheckoutTotals', () => {
  it('applies percentage discount with maximum cap', () => {
    const coupon: SavedCoupon = {
      id: '1',
      code: 'CAP',
      type: 'percentage',
      value: 50,
      minimum_order_amount: null,
      maximum_discount_amount: 10,
    };
    const r = computeCheckoutTotals(
      [{ product: baseProduct, quantity: 2 }],
      coupon,
      { amount: 1000, enabled: true }
    );
    expect(r.subtotal).toBe(100);
    expect(r.discount).toBe(10);
    expect(r.total).toBe(100 - 10 + 6.95);
  });

  it('zeroes shipping when coupon includes free shipping', () => {
    const coupon: SavedCoupon = {
      id: '2',
      code: 'SHIP',
      type: 'fixed',
      value: 0,
      minimum_order_amount: null,
      maximum_discount_amount: null,
      includes_free_shipping: true,
    };
    const r = computeCheckoutTotals(
      [{ product: baseProduct, quantity: 1 }],
      coupon,
      { amount: 1000, enabled: false }
    );
    expect(r.subtotal).toBe(50);
    expect(r.discount).toBe(0);
    expect(r.shipping).toBe(0);
    expect(r.total).toBe(50);
  });
});
