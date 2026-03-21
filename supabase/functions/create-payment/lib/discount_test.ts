import { assertEquals } from '@std/assert';

import type { DiscountCouponRow } from '../types.ts';
import {
  computeDiscountAmountCents,
  hasCouponUsageRemaining,
  isCouponWithinDateRange,
  meetsCouponMinimumOrder,
} from './discount.ts';

Deno.test('isCouponWithinDateRange: open bounds', () => {
  const coupon: Pick<DiscountCouponRow, 'valid_from' | 'valid_until'> = {
    valid_from: null,
    valid_until: null,
  };
  assertEquals(isCouponWithinDateRange(coupon, new Date('2025-06-01')), true);
});

Deno.test('isCouponWithinDateRange: before valid_from', () => {
  const coupon = {
    valid_from: '2025-12-01T00:00:00.000Z',
    valid_until: null,
  };
  assertEquals(isCouponWithinDateRange(coupon, new Date('2025-06-01')), false);
});

Deno.test('hasCouponUsageRemaining', () => {
  assertEquals(
    hasCouponUsageRemaining({ usage_limit: null, usage_count: 99 }),
    true
  );
  assertEquals(
    hasCouponUsageRemaining({ usage_limit: 5, usage_count: 4 }),
    true
  );
  assertEquals(
    hasCouponUsageRemaining({ usage_limit: 5, usage_count: 5 }),
    false
  );
});

Deno.test('meetsCouponMinimumOrder', () => {
  assertEquals(
    meetsCouponMinimumOrder({ minimum_order_amount: null }, 1),
    true
  );
  assertEquals(
    meetsCouponMinimumOrder({ minimum_order_amount: 50 }, 49),
    false
  );
  assertEquals(meetsCouponMinimumOrder({ minimum_order_amount: 50 }, 50), true);
});

Deno.test('computeDiscountAmountCents: percentage', () => {
  const cents = computeDiscountAmountCents(
    { type: 'percentage', value: 10, maximum_discount_amount: null },
    100
  );
  assertEquals(cents, 1000);
});

Deno.test(
  'computeDiscountAmountCents: percentage capped by maximum_discount_amount',
  () => {
    const cents = computeDiscountAmountCents(
      { type: 'percentage', value: 50, maximum_discount_amount: 5 },
      100
    );
    assertEquals(cents, 500);
  }
);

Deno.test('computeDiscountAmountCents: fixed euros to cents', () => {
  const cents = computeDiscountAmountCents(
    { type: 'fixed', value: 12.5, maximum_discount_amount: null },
    999
  );
  assertEquals(cents, 1250);
});
