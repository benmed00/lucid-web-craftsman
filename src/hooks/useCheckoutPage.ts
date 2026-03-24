import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  fetchFreeShippingThresholdSetting,
  validateCouponCodeRpc,
} from '@/services/checkoutApi';
import { createPaymentSessionWithRetry } from '@/services/checkoutService';
import { stockService } from '@/services/stockService';
import { useLazyStripe } from '@/components/performance/LazyStripe';
import { useCart } from '@/stores';
import { useCurrency } from '@/stores/currencyStore';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { useBusinessRules } from '@/hooks/useBusinessRules';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import {
  validateCustomerInfo,
  validateShippingAddress,
  validateCheckoutForm,
  validatePromoCode,
} from '@/utils/checkoutValidation';
import { sanitizeUserInput } from '@/utils/xssProtection';
import {
  useCheckoutSession,
  type CartItemSnapshot,
} from '@/hooks/useCheckoutSession';
import { useCheckoutFormPersistence } from '@/hooks/useCheckoutFormPersistence';
import { type TFunction } from 'i18next';

// =============================================================================
// Hook return types — always `ReturnType<typeof hook>` so signatures stay in sync
// with implementations (single source of truth).
// =============================================================================

type UseTranslationHookReturn = ReturnType<typeof useTranslation>;
type LazyStripeHookReturn = ReturnType<typeof useLazyStripe>;
type CartHookReturn = ReturnType<typeof useCart>;
type CurrencyHookReturn = ReturnType<typeof useCurrency>;
type CsrfTokenHookReturn = ReturnType<typeof useCsrfToken>;
type BusinessRulesHookReturn = ReturnType<typeof useBusinessRules>;
type GuestSessionHookReturn = ReturnType<typeof useGuestSession>;
type OptimizedAuthHookReturn = ReturnType<typeof useOptimizedAuth>;
type CheckoutSessionHookReturn = ReturnType<typeof useCheckoutSession>;
type CheckoutFormPersistenceHookReturn = ReturnType<
  typeof useCheckoutFormPersistence
>;

/**
 * Subset of each hook return that this file reads. Built from the HookReturn
 * aliases above so Pick keys are checked against the real return shape.
 */
type CheckoutPageTranslationSlice = Pick<UseTranslationHookReturn, 't'> & {
  /** Namespace is fixed at the call site: `useTranslation('checkout')`. */
  t: TFunction<'checkout'>;
};
type CheckoutPageStripeSlice = Pick<LazyStripeHookReturn, 'loadStripe'>;
type CheckoutPageCartSlice = Pick<
  CartHookReturn,
  'cart' | 'hasPendingProductResolution'
>;
type CheckoutPageCurrencySlice = Pick<CurrencyHookReturn, 'formatPrice'>;
type CheckoutPageCsrfSlice = Pick<CsrfTokenHookReturn, 'getCsrfHeaders'>;
type CheckoutPageBusinessRulesSlice = Pick<BusinessRulesHookReturn, 'rules'>;
type CheckoutPageGuestSessionSlice = Pick<
  GuestSessionHookReturn,
  'getSessionData'
>;
type CheckoutPageAuthSlice = Pick<OptimizedAuthHookReturn, 'user'>;
type CheckoutPageSessionSlice = Pick<
  CheckoutSessionHookReturn,
  | 'sessionId'
  | 'savePersonalInfo'
  | 'saveShippingInfo'
  | 'savePromoCode'
  | 'saveCartSnapshot'
  | 'updateStep'
  | 'isLoading'
>;
type CheckoutPageFormPersistenceSlice = Pick<
  CheckoutFormPersistenceHookReturn,
  | 'formData'
  | 'setFormData'
  | 'isLoading'
  | 'savedStep'
  | 'savedCompletedSteps'
  | 'saveStepState'
  | 'savedCoupon'
  | 'saveCoupon'
>;

export interface DiscountCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  includes_free_shipping?: boolean;
}

export interface FreeShippingSettings {
  amount: number;
  enabled: boolean;
}

export function useCheckoutPage() {
  const { t }: CheckoutPageTranslationSlice = useTranslation('checkout');
  const { loadStripe: _loadStripe }: CheckoutPageStripeSlice = useLazyStripe();
  const { cart, hasPendingProductResolution }: CheckoutPageCartSlice =
    useCart();
  const { formatPrice }: CheckoutPageCurrencySlice = useCurrency();
  const { getCsrfHeaders }: CheckoutPageCsrfSlice = useCsrfToken();
  const { rules: businessRules }: CheckoutPageBusinessRulesSlice =
    useBusinessRules();
  const { getSessionData: getGuestSessionData }: CheckoutPageGuestSessionSlice =
    useGuestSession();
  const { user }: CheckoutPageAuthSlice = useOptimizedAuth();

  const {
    sessionId: checkoutSessionId,
    savePersonalInfo,
    saveShippingInfo,
    savePromoCode,
    saveCartSnapshot,
    updateStep,
    isLoading: _isSessionLoading,
  }: CheckoutPageSessionSlice = useCheckoutSession();

  const {
    formData,
    setFormData,
    isLoading: isFormLoading,
    savedStep,
    savedCompletedSteps,
    saveStepState,
    savedCoupon,
    saveCoupon,
  }: CheckoutPageFormPersistenceSlice = useCheckoutFormPersistence();

  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Restore step state
  useEffect(() => {
    if (!isFormLoading && !hasRestoredState) {
      if (savedStep > 1 && savedCompletedSteps.length > 0) {
        setStep(savedStep);
        setCompletedSteps(savedCompletedSteps);
      }
      if (savedCoupon) setAppliedCoupon(savedCoupon);
      setHasRestoredState(true);
    }
  }, [
    isFormLoading,
    hasRestoredState,
    savedStep,
    savedCompletedSteps,
    savedCoupon,
  ]);

  // Promo state
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(
    null
  );
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  const [freeShippingSettings, setFreeShippingSettings] =
    useState<FreeShippingSettings>({
      amount: 100,
      enabled: true,
    });

  const cartItems = cart.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
  }));

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [_paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentOpenedInTab, setPaymentOpenedInTab] = useState(false);

  // Fetch free shipping settings
  useEffect(() => {
    const fetch = async () => {
      try {
        const raw = await fetchFreeShippingThresholdSetting();
        if (raw) {
          setFreeShippingSettings(raw as unknown as FreeShippingSettings);
        }
      } catch (e) {
        console.error('Error fetching free shipping settings:', e);
      }
    };
    fetch();
  }, []);

  // Payment redirect cleanup
  useEffect(() => {
    const paymentPending = localStorage.getItem('checkout_payment_pending');
    if (paymentPending) {
      localStorage.removeItem('checkout_payment_pending');
      setIsProcessing(false);
      setPaymentInitiated(false);
    }
  }, []);

  useEffect(() => {
    if (!paymentOpenedInTab) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setIsProcessing(false);
        setPaymentOpenedInTab(false);
        setPaymentInitiated(false);
        localStorage.removeItem('checkout_payment_pending');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [paymentOpenedInTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { id, value } = e.target;
      setFormErrors((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

  const handleFieldChange = useCallback(
    (field: string, value: string) =>
      setFormData((prev) => ({ ...prev, [field]: value })),
    []
  );

  const handleClearError = useCallback(
    (field: string) =>
      setFormErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      }),
    []
  );

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const calculateDiscount = (): number => {
    if (!appliedCoupon) return 0;
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
    return Math.min(d, subtotal);
  };

  const discount = calculateDiscount();
  const hasFreeShipping =
    appliedCoupon?.includes_free_shipping ||
    (freeShippingSettings.enabled && subtotal >= freeShippingSettings.amount);
  const shippingCost = 6.95;
  const shipping = hasFreeShipping ? 0 : subtotal > 0 ? shippingCost : 0;
  const total = subtotal - discount + shipping;

  // Promo code validation
  const handleValidatePromoCode = async () => {
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

      const coupon = row as unknown as DiscountCoupon;
      setAppliedCoupon(coupon);
      saveCoupon(coupon as any);
      setPromoCode('');
      toast.success(t('promo.applied'));

      const discountApplied =
        coupon.type === 'percentage'
          ? (subtotal * coupon.value) / 100
          : coupon.value;
      savePromoCode({
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
  };

  const removePromoCode = () => {
    setAppliedCoupon(null);
    saveCoupon(null);
    savePromoCode(null);
    toast.info(t('promo.remove'));
  };

  // Step navigation
  const goToNextStep = useCallback(() => {
    setFormErrors({});
    if (honeypot) {
      console.warn('Bot detected');
      toast.error(t('errors.genericError'));
      return;
    }

    let newCompletedSteps = [...completedSteps];

    if (step === 1) {
      const v = validateCustomerInfo({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
      });
      if (!v.success) {
        setFormErrors(v.errors || {});
        toast.error(
          Object.values(v.errors || {})[0] || t('errors.requiredField')
        );
        return;
      }
      const s = {
        firstName: v.data!.firstName,
        lastName: v.data!.lastName,
        email: v.data!.email,
        phone: v.data!.phone || '',
      };
      setFormData((prev) => ({ ...prev, ...s }));
      savePersonalInfo({
        first_name: s.firstName,
        last_name: s.lastName,
        email: s.email,
        phone: s.phone || undefined,
      });
      if (!newCompletedSteps.includes(1))
        newCompletedSteps = [...newCompletedSteps, 1];
      setCompletedSteps(newCompletedSteps);
    } else if (step === 2) {
      const v = validateShippingAddress({
        address: formData.address,
        addressComplement: formData.addressComplement || undefined,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
      });
      if (!v.success) {
        setFormErrors(v.errors || {});
        toast.error(
          Object.values(v.errors || {})[0] || t('errors.requiredField')
        );
        return;
      }
      const s = {
        address: v.data!.address,
        addressComplement: v.data!.addressComplement || '',
        postalCode: v.data!.postalCode,
        city: v.data!.city,
        country: v.data!.country,
      };
      setFormData((prev) => ({ ...prev, ...s }));
      saveShippingInfo({
        address_line1: s.address,
        address_line2: s.addressComplement || undefined,
        postal_code: s.postalCode,
        city: s.city,
        country: s.country,
      });
      const cartSnapshot: CartItemSnapshot[] = cartItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Math.round(item.product.price * 100),
        total_price: Math.round(item.product.price * item.quantity * 100),
      }));
      saveCartSnapshot(
        cartSnapshot,
        Math.round(subtotal * 100),
        Math.round(shipping * 100),
        Math.round(total * 100)
      );
      if (!newCompletedSteps.includes(2))
        newCompletedSteps = [...newCompletedSteps, 2];
      setCompletedSteps(newCompletedSteps);
    }

    const nextStep = step + 1;
    setStep(nextStep);
    saveStepState(nextStep, newCompletedSteps);
    if (promoError) {
      setPromoCode('');
      setPromoError('');
    }
    updateStep(nextStep, Math.max(...newCompletedSteps, 0));
  }, [
    step,
    formData,
    honeypot,
    completedSteps,
    promoError,
    saveStepState,
    savePersonalInfo,
    saveShippingInfo,
    saveCartSnapshot,
    updateStep,
    cartItems,
    subtotal,
    shipping,
    total,
    t,
  ]);

  const handleEditStep = useCallback(
    (targetStep: number) => {
      const n = completedSteps.filter((s) => s < targetStep);
      setCompletedSteps(n);
      setStep(targetStep);
      saveStepState(targetStep, n);
    },
    [completedSteps, saveStepState]
  );

  // Payment
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      if (honeypot) {
        toast.error(t('errors.genericError'));
        setIsProcessing(false);
        return;
      }

      const { minOrderAmount, maxOrderAmount } = businessRules.cart;
      if (minOrderAmount > 0 && subtotal < minOrderAmount) {
        toast.error(
          t('promo.minOrder', { amount: formatPrice(minOrderAmount) })
        );
        setIsProcessing(false);
        return;
      }
      if (maxOrderAmount > 0 && subtotal > maxOrderAmount) {
        toast.error(t('errors.genericError'));
        setIsProcessing(false);
        return;
      }

      const fullValidation = validateCheckoutForm(formData);
      if (!fullValidation.success) {
        setFormErrors(fullValidation.errors || {});
        toast.error(
          Object.values(fullValidation.errors || {})[0] ||
            t('errors.requiredField')
        );
        setIsProcessing(false);
        return;
      }

      const sanitizedFormData = fullValidation.data!;

      const stockVerification = await stockService.reserveStock(
        cartItems.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        }))
      );
      if (!stockVerification.success) {
        const errors = stockVerification.errors || [];
        const errorMessages = errors
          .map(
            (error) =>
              `${cartItems.find((item) => item.product.id === error.productId)?.product.name}: ${error.error}`
          )
          .join('\n');
        toast.error(t('errors.stockError') + `:\n${errorMessages}`);
        setIsProcessing(false);
        return;
      }

      const csrfHeaders = await getCsrfHeaders();
      const guestSession = getGuestSessionData();
      if (!user && !guestSession) {
        toast.error(
          t(
            'errors.genericError',
            'Session de paiement indisponible. Veuillez reessayer.'
          )
        );
        setIsProcessing(false);
        return;
      }
      const functionName =
        paymentMethod === 'paypal' ? 'create-paypal-payment' : 'create-payment';

      const { data, error } = await createPaymentSessionWithRetry(
        functionName,
        {
          items: cartItems,
          customerInfo: sanitizedFormData,
          guestSession,
          discount: appliedCoupon
            ? {
                couponId: appliedCoupon.id,
                code: sanitizeUserInput(appliedCoupon.code),
                amount: discount,
                includesFreeShipping:
                  appliedCoupon.includes_free_shipping || false,
              }
            : null,
        },
        {
          ...csrfHeaders,
          ...(checkoutSessionId
            ? { 'x-checkout-session-id': checkoutSessionId }
            : {}),
        },
        {
          maxAttempts: 2,
          baseDelayMs: 1000,
          onRetry: () =>
            toast.info('Nouvelle tentative de paiement...', { duration: 2000 }),
        }
      );

      if (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          toast.error(
            t(
              'errors.rateLimited',
              'Trop de tentatives. Veuillez patienter quelques minutes.'
            )
          );
        } else if (
          errorMsg.includes('stock') ||
          errorMsg.includes('indisponible') ||
          errorMsg.includes('insuffisant')
        ) {
          toast.error(errorMsg);
        } else {
          throw new Error(errorMsg);
        }
        setIsProcessing(false);
        return;
      }

      if (data?.url) {
        setPaymentInitiated(true);
        localStorage.setItem('checkout_payment_pending', 'true');
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('introuvable') ||
        errorMessage.includes('indisponible') ||
        errorMessage.includes('insuffisant')
      ) {
        toast.error(errorMessage);
      } else if (
        errorMessage.includes('Invalid email') ||
        errorMessage.includes('invalide')
      ) {
        toast.error(
          t('errors.invalidEmail', 'Veuillez vérifier vos informations.')
        );
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch')
      ) {
        toast.error(
          t(
            'errors.networkError',
            'Erreur réseau. Vérifiez votre connexion et réessayez.'
          )
        );
      } else {
        toast.error(t('errors.paymentFailed'));
      }
      setIsProcessing(false);
    }
  };

  return {
    // State
    hasPendingProductResolution,
    step,
    completedSteps,
    formData,
    formErrors,
    honeypot,
    paymentMethod,
    isProcessing,
    isFormLoading,
    hasRestoredState,
    // Promo
    promoCode,
    setPromoCode,
    promoError,
    setPromoError,
    appliedCoupon,
    isValidatingPromo,
    handleValidatePromoCode,
    removePromoCode,
    // Totals
    cartItems,
    subtotal,
    discount,
    shipping,
    total,
    hasFreeShipping: !!hasFreeShipping,
    shippingCost,
    freeShippingSettings,
    // Actions
    handleInputChange,
    handleFieldChange,
    handleClearError,
    setHoneypot,
    setPaymentMethod,
    goToNextStep,
    handleEditStep,
    handlePayment,
    // Misc
    t,
    formatPrice,
  };
}
