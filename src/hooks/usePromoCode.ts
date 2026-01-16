// src/hooks/usePromoCode.ts
// Extracted promo code logic from Checkout.tsx

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePromoCode } from '@/utils/checkoutValidation';
import { toast } from 'sonner';

export interface DiscountCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  includes_free_shipping?: boolean;
}

interface UsePromoCodeOptions {
  subtotal: number;
}

interface UsePromoCodeReturn {
  promoCode: string;
  setPromoCode: (code: string) => void;
  appliedCoupon: DiscountCoupon | null;
  isValidating: boolean;
  error: string;
  discount: number;
  hasFreeShipping: boolean;
  validateAndApply: () => Promise<void>;
  remove: () => void;
}

export function usePromoCode({ subtotal }: UsePromoCodeOptions): UsePromoCodeReturn {
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Calculate discount amount
  const calculateDiscount = useCallback((): number => {
    if (!appliedCoupon) return 0;

    let discountAmount = 0;
    if (appliedCoupon.type === 'percentage') {
      discountAmount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discountAmount = appliedCoupon.value;
    }

    // Apply maximum discount limit if set
    if (appliedCoupon.maximum_discount_amount && discountAmount > appliedCoupon.maximum_discount_amount) {
      discountAmount = appliedCoupon.maximum_discount_amount;
    }

    // Don't exceed subtotal
    return Math.min(discountAmount, subtotal);
  }, [appliedCoupon, subtotal]);

  // Validate and apply promo code
  const validateAndApply = useCallback(async () => {
    // First validate the promo code format
    const promoValidation = validatePromoCode(promoCode);
    if (!promoValidation.success) {
      setError(promoValidation.error || 'Code promo invalide');
      return;
    }

    const sanitizedCode = promoValidation.data!;
    setIsValidating(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', sanitizedCode)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError('Code promo invalide ou expiré');
        setIsValidating(false);
        return;
      }

      // Check validity dates
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setError("Ce code promo n'est pas encore actif");
        setIsValidating(false);
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setError('Ce code promo a expiré');
        setIsValidating(false);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setError("Ce code promo a atteint sa limite d'utilisation");
        setIsValidating(false);
        return;
      }

      // Check minimum order amount
      if (data.minimum_order_amount && subtotal < data.minimum_order_amount) {
        setError(`Commande minimum de ${data.minimum_order_amount.toFixed(2)} € requise`);
        setIsValidating(false);
        return;
      }

      // Apply coupon
      const coupon: DiscountCoupon = {
        id: data.id,
        code: data.code,
        type: data.type as 'percentage' | 'fixed',
        value: data.value,
        minimum_order_amount: data.minimum_order_amount,
        maximum_discount_amount: data.maximum_discount_amount,
        includes_free_shipping: data.includes_free_shipping ?? undefined,
      };

      setAppliedCoupon(coupon);
      setPromoCode('');
      toast.success('Code promo appliqué !');
    } catch (err) {
      console.error('Error validating promo code:', err);
      setError('Erreur lors de la validation du code');
    } finally {
      setIsValidating(false);
    }
  }, [promoCode, subtotal]);

  // Remove applied coupon
  const remove = useCallback(() => {
    setAppliedCoupon(null);
    toast.info('Code promo retiré');
  }, []);

  return {
    promoCode,
    setPromoCode,
    appliedCoupon,
    isValidating,
    error,
    discount: calculateDiscount(),
    hasFreeShipping: appliedCoupon?.includes_free_shipping ?? false,
    validateAndApply,
    remove,
  };
}
