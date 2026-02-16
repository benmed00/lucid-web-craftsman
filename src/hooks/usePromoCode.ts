/**
 * Promo Code Hook
 * Handles validation and application of discount coupons
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validatePromoCode } from '@/utils/checkoutValidation';
import { toast } from 'sonner';
import { handleError, DatabaseError, ValidationError } from '@/lib/errors/AppError';
import { useCurrency } from '@/stores/currencyStore';

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

interface CouponValidationResult {
  isValid: boolean;
  error?: string;
}

export function usePromoCode({ subtotal }: UsePromoCodeOptions): UsePromoCodeReturn {
  const [promoCode, setPromoCodeRaw] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  // Clear error when user types a new promo code
  const setPromoCode = useCallback((code: string) => {
    setPromoCodeRaw(code);
    if (error) setError('');
  }, [error]);
  const { formatPrice } = useCurrency();

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

  // Validate coupon data against business rules
  const validateCouponData = useCallback((data: any): CouponValidationResult => {
    const now = new Date();

    if (data.valid_from && new Date(data.valid_from) > now) {
      return { isValid: false, error: "Ce code promo n'est pas encore actif" };
    }

    if (data.valid_until && new Date(data.valid_until) < now) {
      return { isValid: false, error: 'Ce code promo a expiré' };
    }

    if (data.usage_limit && data.usage_count >= data.usage_limit) {
      return { isValid: false, error: "Ce code promo a atteint sa limite d'utilisation" };
    }

    if (data.minimum_order_amount && subtotal < data.minimum_order_amount) {
      return { 
        isValid: false, 
        error: `Commande minimum de ${formatPrice(data.minimum_order_amount)} requise` 
      };
    }

    return { isValid: true };
  }, [subtotal]);

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
        .maybeSingle();

      if (fetchError) {
        throw new DatabaseError(`Failed to validate promo code: ${fetchError.message}`, fetchError.code);
      }

      if (!data) {
        throw new ValidationError('Code promo invalide ou expiré');
      }

      // Validate coupon against business rules
      const validation = validateCouponData(data);
      if (!validation.isValid) {
        setError(validation.error || 'Code promo invalide');
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
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        handleError(err, 'usePromoCode.validateAndApply');
        setError('Erreur lors de la validation du code');
      }
    } finally {
      setIsValidating(false);
    }
  }, [promoCode, validateCouponData]);

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
