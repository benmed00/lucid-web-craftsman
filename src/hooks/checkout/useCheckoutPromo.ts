import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { TFunction } from 'i18next';

import { validateCouponCodeRpc } from '@/services/checkoutApi';
import type {
  PromoCodeData,
} from '@/hooks/useCheckoutSession';
import type { SavedCoupon } from '@/hooks/useCheckoutFormPersistence';
import { validatePromoCode } from '@/utils/checkoutValidation';

interface UseCheckoutPromoParams {
  t: TFunction<'checkout'>;
  formatPrice: (amount: number) => string;
  subtotal: number;
  saveCoupon: (coupon: SavedCoupon | null) => void;
  savePromoCode: (data: PromoCodeData | null) => Promise<void>;
}

export function useCheckoutPromo({
  t,
  formatPrice,
  subtotal,
  saveCoupon,
  savePromoCode,
}: UseCheckoutPromoParams) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<SavedCoupon | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleValidatePromoCode = useCallback(async () => {
    const promoValidation = validatePromoCode(promoCode);
    if (!promoValidation.success) {
      setPromoError(promoValidation.error || t('promo.invalid'));
      return;
    }
    const sanitizedCode = promoValidation.data!;
    setIsValidatingPromo(true);
    setPromoError('');

    try {
      let data: unknown;
      try {
        data = await validateCouponCodeRpc(sanitizedCode);
      } catch {
        setPromoError(t('promo.invalid'));
        return;
      }

      if (!data) {
        setPromoError(t('promo.invalid'));
        return;
      }

      const row = data as Record<string, unknown>;
      const now = new Date();
      if (row.valid_from && new Date(String(row.valid_from)) > now) {
        setPromoError(t('promo.invalid'));
        return;
      }
      if (row.valid_until && new Date(String(row.valid_until)) < now) {
        setPromoError(t('promo.expired'));
        return;
      }
      if (
        row.usage_limit &&
        Number(row.usage_count) >= Number(row.usage_limit)
      ) {
        setPromoError(t('promo.limitReached'));
        return;
      }
      const minOrd = row.minimum_order_amount;
      if (typeof minOrd === 'number' && subtotal < minOrd) {
        setPromoError(
          t('promo.minOrder', {
            amount: formatPrice(minOrd),
          })
        );
        return;
      }

      const rawType = row.type;
      if (rawType !== 'percentage' && rawType !== 'fixed') {
        setPromoError(t('promo.invalid'));
        return;
      }

      const coupon: SavedCoupon = {
        id: String(row.id ?? ''),
        code: String(row.code ?? ''),
        type: rawType,
        value: Number(row.value),
        minimum_order_amount:
          typeof row.minimum_order_amount === 'number'
            ? row.minimum_order_amount
            : null,
        maximum_discount_amount:
          typeof row.maximum_discount_amount === 'number'
            ? row.maximum_discount_amount
            : null,
        includes_free_shipping: Boolean(row.includes_free_shipping),
      };
      setAppliedCoupon(coupon);
      saveCoupon(coupon);
      setPromoCode('');
      toast.success(t('promo.applied'));

      const discountApplied =
        coupon.type === 'percentage'
          ? (subtotal * coupon.value) / 100
          : coupon.value;
      await savePromoCode({
        code: coupon.code,
        valid: true,
        discount_type: coupon.type as 'percentage' | 'fixed',
        discount_value: coupon.value,
        discount_applied: Math.round(Math.min(discountApplied, subtotal) * 100),
        free_shipping: coupon.includes_free_shipping || false,
      });
    } catch (err) {
      console.error('Error validating promo code:', err);
      setPromoError(t('errors.genericError'));
    } finally {
      setIsValidatingPromo(false);
    }
  }, [formatPrice, promoCode, saveCoupon, savePromoCode, subtotal, t]);

  const removePromoCode = useCallback(() => {
    setAppliedCoupon(null);
    saveCoupon(null);
    void savePromoCode(null);
    toast.info(t('promo.remove'));
  }, [saveCoupon, savePromoCode, t]);

  return {
    promoCode,
    setPromoCode,
    appliedCoupon,
    setAppliedCoupon,
    isValidatingPromo,
    promoError,
    setPromoError,
    handleValidatePromoCode,
    removePromoCode,
  };
}
