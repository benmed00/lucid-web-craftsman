import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import type { TFunction } from 'i18next';

import { createPaymentSessionWithRetry } from '@/services/checkoutService';
import { stockService } from '@/services/stockService';
import type {
  CheckoutFormData,
  SavedCoupon,
} from '@/hooks/useCheckoutFormPersistence';
import { validateCheckoutForm } from '@/utils/checkoutValidation';
import { sanitizeUserInput } from '@/utils/xssProtection';
import { isEligibleForCOD } from '@/utils/shipping';

import type { CheckoutCartLine } from './checkoutPageTotals';

export interface BusinessRulesCartSlice {
  minOrderAmount: number;
  maxOrderAmount: number;
}

interface UseCheckoutPaymentParams {
  t: TFunction<'checkout'>;
  formatPrice: (amount: number) => string;
  businessRulesCart: BusinessRulesCartSlice;
  cartItems: CheckoutCartLine[];
  formData: CheckoutFormData;
  appliedCoupon: SavedCoupon | null;
  discount: number;
  subtotal: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  setPaymentMethod: Dispatch<SetStateAction<string>>;
  honeypot: string;
  getCsrfHeaders: () => Promise<Record<string, string>>;
  getGuestSessionData: () => unknown;
  user: unknown;
  checkoutSessionId: string | null;
  setFormErrors: Dispatch<SetStateAction<Record<string, string>>>;
}

export function useCheckoutPayment({
  t,
  formatPrice,
  businessRulesCart,
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
}: UseCheckoutPaymentParams) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [_paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentOpenedInTab, setPaymentOpenedInTab] = useState(false);

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

  const handlePayment = useCallback(async () => {
    try {
      setIsProcessing(true);
      setPaymentError(null);

      import('@/lib/abThemeConversion')
        .then(({ trackABConversion }) => trackABConversion('checkout'))
        .catch(() => {});
      if (honeypot) {
        toast.error(t('errors.genericError'));
        setIsProcessing(false);
        return;
      }

      const { minOrderAmount, maxOrderAmount } = businessRulesCart;
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
      if (paymentMethod === 'cod') {
        if (!isEligibleForCOD(formData.postalCode)) {
          toast.error(
            "Le paiement à la livraison n'est pas disponible pour cette adresse."
          );
          setPaymentMethod('card');
          setIsProcessing(false);
          return;
        }
      }

      const functionName =
        paymentMethod === 'paypal' ? 'create-paypal-payment' : 'create-payment';

      const headerRecord: Record<string, string> = {
        ...csrfHeaders,
        ...(checkoutSessionId
          ? { 'x-checkout-session-id': checkoutSessionId }
          : {}),
      };

      const { data, error } = await createPaymentSessionWithRetry(
        functionName,
        {
          items: cartItems,
          customerInfo: sanitizedFormData,
          guestSession,
          paymentMethod,
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
        headerRecord,
        {
          maxAttempts: 2,
          baseDelayMs: 1000,
          onRetry: () => toast.info(t('payment.retrying'), { duration: 2000 }),
        }
      );

      if (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          toast.error(t('errors.rateLimited'));
        } else if (errorMsg.trim()) {
          toast.error(errorMsg);
        } else {
          toast.error(t('errors.paymentFailed'));
        }
        setIsProcessing(false);
        return;
      }

      if (data?.url) {
        setPaymentInitiated(true);
        localStorage.setItem('checkout_payment_pending', 'true');

        try {
          const snapshot = {
            email: sanitizedFormData.email,
            customerName:
              `${sanitizedFormData.firstName} ${sanitizedFormData.lastName}`.trim(),
            items: cartItems.map((item) => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
              image: item.product.images?.[0] || undefined,
            })),
            subtotal,
            shipping,
            discount,
            total,
            currency: 'EUR',
            timestamp: Date.now(),
          };
          localStorage.setItem('checkout_snapshot', JSON.stringify(snapshot));
        } catch {
          // Non-critical — confirmation page will still work without snapshot
        }

        const target = window.top ?? window;
        target.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let userMessage: string;
      if (
        errorMessage.includes('introuvable') ||
        errorMessage.includes('indisponible') ||
        errorMessage.includes('insuffisant')
      ) {
        userMessage = errorMessage;
      } else if (
        errorMessage.includes('Invalid email') ||
        errorMessage.includes('invalide')
      ) {
        userMessage = t(
          'errors.invalidEmail',
          'Veuillez vérifier vos informations.'
        );
      } else if (
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch')
      ) {
        userMessage = t(
          'errors.networkError',
          'Erreur réseau. Vérifiez votre connexion et réessayez.'
        );
      } else {
        userMessage = t('errors.paymentFailed');
      }
      setPaymentError(userMessage);
      toast.error(userMessage);
      setIsProcessing(false);
    }
  }, [
    appliedCoupon,
    businessRulesCart,
    cartItems,
    checkoutSessionId,
    discount,
    formData,
    formatPrice,
    getCsrfHeaders,
    getGuestSessionData,
    honeypot,
    paymentMethod,
    setFormErrors,
    setPaymentMethod,
    shipping,
    subtotal,
    t,
    total,
    user,
  ]);

  return {
    isProcessing,
    paymentError,
    paymentOpenedInTab,
    setPaymentOpenedInTab,
    handlePayment,
  };
}
