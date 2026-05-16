import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchFreeShippingThresholdSetting } from '@/services/checkoutApi';
import { useLazyStripe } from '@/components/performance/LazyStripe';
import { useCart } from '@/stores';
import { useCurrency } from '@/stores/currencyStore';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { useBusinessRules } from '@/hooks/useBusinessRules';
import { useGuestSession } from '@/hooks/useGuestSession';
import { useOptimizedAuth } from '@/context/AuthContext';
import { useCheckoutSession } from '@/hooks/useCheckoutSession';
import {
  useCheckoutFormPersistence,
  type SavedCoupon,
} from '@/hooks/useCheckoutFormPersistence';
import { isEligibleForCOD } from '@/utils/shipping';

import {
  computeCheckoutTotals,
  type FreeShippingSettings,
} from '@/hooks/checkout/checkoutPageTotals';

import { useCheckoutPersistedHydration } from '@/hooks/checkout/useCheckoutPersistedHydration';
import { useCheckoutPromo } from '@/hooks/checkout/useCheckoutPromo';
import { useCheckoutStepNavigation } from '@/hooks/checkout/useCheckoutStepNavigation';
import { useCheckoutPayment } from '@/hooks/checkout/useCheckoutPayment';

export type { FreeShippingSettings } from '@/hooks/checkout/checkoutPageTotals';

/** Same shape as storefront coupon rows; prefer {@link SavedCoupon} from form persistence. */
export type DiscountCoupon = SavedCoupon;

export function useCheckoutPage() {
  const { t } = useTranslation('checkout');
  const { loadStripe: _loadStripe } = useLazyStripe();
  const { cart, hasPendingProductResolution } = useCart();
  const { formatPrice } = useCurrency();
  const { getCsrfHeaders } = useCsrfToken();
  const { rules: businessRules } = useBusinessRules();
  const { getSessionData: getGuestSessionData } = useGuestSession();
  const { user } = useOptimizedAuth();

  const {
    sessionId: checkoutSessionId,
    savePersonalInfo,
    saveShippingInfo,
    savePromoCode,
    saveCartSnapshot,
    updateStep,
    isLoading: _isSessionLoading,
  } = useCheckoutSession();

  const {
    formData,
    setFormData,
    isLoading: isFormLoading,
    savedStep,
    savedCompletedSteps,
    saveStepState,
    savedCoupon,
    saveCoupon,
  } = useCheckoutFormPersistence();

  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');

  const [freeShippingSettings, setFreeShippingSettings] =
    useState<FreeShippingSettings>({
      amount: 100,
      enabled: true,
    });

  const cartItems = cart.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
  }));

  const lineSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const {
    promoCode,
    setPromoCode,
    appliedCoupon,
    setAppliedCoupon,
    isValidatingPromo,
    promoError,
    setPromoError,
    handleValidatePromoCode,
    removePromoCode,
  } = useCheckoutPromo({
    t,
    formatPrice,
    subtotal: lineSubtotal,
    saveCoupon,
    savePromoCode,
  });

  const {
    subtotal,
    discount,
    shipping,
    total,
    hasFreeShipping,
    shippingCost,
  } = computeCheckoutTotals(cartItems, appliedCoupon, freeShippingSettings);

  const { hasRestoredState } = useCheckoutPersistedHydration({
    isFormLoading,
    savedStep,
    savedCompletedSteps,
    savedCoupon,
    setStep,
    setCompletedSteps,
    setAppliedCoupon,
  });

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
    void fetch();
  }, []);

  const { goToNextStep, handleEditStep } = useCheckoutStepNavigation({
    t,
    step,
    setStep,
    honeypot,
    promoError,
    formData,
    setFormData,
    setFormErrors,
    setPromoCode,
    setPromoError,
    completedSteps,
    setCompletedSteps,
    cartItems,
    subtotal,
    shipping,
    total,
    saveStepState,
    savePersonalInfo,
    saveShippingInfo,
    saveCartSnapshot,
    updateStep,
  });

  const { isProcessing, paymentError, handlePayment } = useCheckoutPayment({
    t,
    formatPrice,
    businessRulesCart: businessRules.cart,
    cartItems,
    formData,
    appliedCoupon,
    discount,
    subtotal,
    shipping,
    total,
    paymentMethod,
    setPaymentMethod,
    honeypot,
    getCsrfHeaders,
    getGuestSessionData,
    user,
    checkoutSessionId,
    setFormErrors,
  });

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { id, value } = e.target;
      setFormErrors((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      setFormData((prev) => ({ ...prev, [id]: value }));
      if (id === 'country' && value !== 'FR') {
        setPaymentMethod((prev) => (prev === 'cod' ? 'card' : prev));
      }
    },
    [setFormData, setFormErrors, setPaymentMethod]
  );

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (field === 'postalCode') {
        setPaymentMethod((prev) =>
          prev === 'cod' && !isEligibleForCOD(value) ? 'card' : prev
        );
      }
    },
    [setFormData, setPaymentMethod]
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

  return {
    hasPendingProductResolution,
    step,
    completedSteps,
    formData,
    formErrors,
    paymentError,
    honeypot,
    paymentMethod,
    isProcessing,
    isFormLoading,
    hasRestoredState,
    promoCode,
    setPromoCode,
    promoError,
    setPromoError,
    appliedCoupon,
    isValidatingPromo,
    handleValidatePromoCode,
    removePromoCode,
    cartItems,
    subtotal,
    discount,
    shipping,
    total,
    hasFreeShipping,
    shippingCost,
    freeShippingSettings,
    handleInputChange,
    handleFieldChange,
    handleClearError,
    setHoneypot,
    setPaymentMethod,
    goToNextStep,
    handleEditStep,
    handlePayment,
    t,
    formatPrice,
  };
}
