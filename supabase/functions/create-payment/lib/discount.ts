import type {
  PostgrestError,
  PostgrestMaybeSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js';

import type {
  CheckoutRequestBody,
  DiscountCouponRow,
  VerifiedCartItem,
} from '../types.ts';
import type { LogStep } from './log.ts';

/** Date window: null bounds mean “no limit” on that side. */
export function isCouponWithinDateRange(
  coupon: Pick<DiscountCouponRow, 'valid_from' | 'valid_until'>,
  now: Date
): boolean {
  const validFrom: Date | null = coupon.valid_from
    ? new Date(coupon.valid_from)
    : null;
  const validUntil: Date | null = coupon.valid_until
    ? new Date(coupon.valid_until)
    : null;
  return (
    (!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)
  );
}

export function hasCouponUsageRemaining(
  coupon: Pick<DiscountCouponRow, 'usage_limit' | 'usage_count'>
): boolean {
  if (!coupon.usage_limit) return true;
  return (coupon.usage_count || 0) < coupon.usage_limit;
}

export function meetsCouponMinimumOrder(
  coupon: Pick<DiscountCouponRow, 'minimum_order_amount'>,
  subtotalEuros: number
): boolean {
  if (!coupon.minimum_order_amount) return true;
  return subtotalEuros >= coupon.minimum_order_amount;
}

/** Percentage applies to subtotal (euros); fixed `value` is euros → returned cents. */
export function computeDiscountAmountCents(
  coupon: Pick<
    DiscountCouponRow,
    'type' | 'value' | 'maximum_discount_amount'
  >,
  subtotalEuros: number
): number {
  if (coupon.type === 'percentage') {
    let discountAmountCents: number = Math.round(
      subtotalEuros * 100 * (coupon.value / 100)
    );
    if (coupon.maximum_discount_amount) {
      discountAmountCents = Math.min(
        discountAmountCents,
        Math.round(coupon.maximum_discount_amount * 100)
      );
    }
    return discountAmountCents;
  }
  return Math.round(coupon.value * 100);
}

export type ServerDiscountResult = {
  discountAmountCents: number;
  hasFreeShipping: boolean;
  verifiedDiscountCode: string | null;
};

/**
 * Server-side coupon validation. Starts from client `includesFreeShipping` hint;
 * may extend free shipping when the coupon grants it.
 */
export async function resolveServerDiscount(
  supabase: SupabaseClient,
  verifiedItems: VerifiedCartItem[],
  discount: CheckoutRequestBody['discount'],
  log: LogStep
): Promise<ServerDiscountResult> {
  let discountAmountCents = 0;
  let hasFreeShipping = discount?.includesFreeShipping === true;
  let verifiedDiscountCode: string | null = null;

  if (discount?.code) {
    const couponQuery: PostgrestMaybeSingleResponse<DiscountCouponRow> =
      (await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', discount.code)
        .eq('is_active', true)
        .maybeSingle()) as PostgrestMaybeSingleResponse<DiscountCouponRow>;
    const couponError: PostgrestError | null = couponQuery.error;
    const coupon: DiscountCouponRow | null = couponQuery.data;

    if (couponError || !coupon) {
      log('Invalid discount code', { code: discount.code });
    } else {
      const now: Date = new Date();
      if (
        isCouponWithinDateRange(coupon, now) &&
        hasCouponUsageRemaining(coupon)
      ) {
        const subtotalEuros: number = verifiedItems.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );

        if (meetsCouponMinimumOrder(coupon, subtotalEuros)) {
          discountAmountCents = computeDiscountAmountCents(
            coupon,
            subtotalEuros
          );
          verifiedDiscountCode = coupon.code;
          hasFreeShipping =
            hasFreeShipping || coupon.includes_free_shipping === true;
          log('Server-verified discount', {
            code: coupon.code,
            discountCents: discountAmountCents,
          });
        }
      }
    }
  } else if (
    discount &&
    typeof discount.amount === 'number' &&
    discount.amount > 0
  ) {
    log(
      'WARNING: Discount amount provided without code — ignoring for security'
    );
  }

  return {
    discountAmountCents,
    hasFreeShipping,
    verifiedDiscountCode,
  };
}
