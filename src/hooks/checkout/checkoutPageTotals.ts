import type { SavedCoupon } from '@/hooks/useCheckoutFormPersistence';

export interface FreeShippingSettings {
  amount: number;
  enabled: boolean;
}

export interface CheckoutCartLine {
  product: {
    id: number;
    name: string;
    price: number;
    images?: string[];
  };
  quantity: number;
}

export function computeCheckoutTotals(
  cartItems: CheckoutCartLine[],
  appliedCoupon: SavedCoupon | null,
  freeShippingSettings: FreeShippingSettings
) {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let discount = 0;
  if (appliedCoupon) {
    let d =
      appliedCoupon.type === 'percentage'
        ? (subtotal * appliedCoupon.value) / 100
        : appliedCoupon.value;
    if (
      appliedCoupon.maximum_discount_amount &&
      d > appliedCoupon.maximum_discount_amount
    ) {
      d = appliedCoupon.maximum_discount_amount;
    }
    discount = Math.min(d, subtotal);
  }

  const hasFreeShipping =
    appliedCoupon?.includes_free_shipping ||
    (freeShippingSettings.enabled && subtotal >= freeShippingSettings.amount);
  const shippingCost = 6.95;
  const shipping = hasFreeShipping ? 0 : subtotal > 0 ? shippingCost : 0;
  const total = subtotal - discount + shipping;

  return {
    subtotal,
    discount,
    shipping,
    total,
    hasFreeShipping: !!hasFreeShipping,
    shippingCost,
  };
}
