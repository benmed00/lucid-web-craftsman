import {
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Stripe } from '@stripe/stripe-js'; // Type import only
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { STRIPE_PUBLIC_KEY } from '@/lib/stripe';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { stockService } from '@/services/stockService';
import { useLazyStripe } from '@/components/performance/LazyStripe';
import { useCart } from '@/stores';
import { useCurrency } from '@/stores/currencyStore';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { useBusinessRules } from '@/hooks/useBusinessRules';
import { useGuestSession } from '@/hooks/useGuestSession';
import {
  validateCustomerInfo,
  validateShippingAddress,
  validateCheckoutForm,
  validatePromoCode,
} from '@/utils/checkoutValidation';
import { sanitizeUserInput } from '@/utils/xssProtection';
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import {
  useCheckoutSession,
} from '@/hooks/useCheckoutSession';
import CheckoutProgress from '@/components/checkout/CheckoutProgress';
import { useCheckoutFormPersistence } from '@/hooks/useCheckoutFormPersistence';
import { Skeleton } from '@/components/ui/skeleton';

// Extracted step components
import CustomerInfoStep from '@/components/checkout/CustomerInfoStep';
import ShippingStep from '@/components/checkout/ShippingStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';

// Discount coupon type
interface DiscountCoupon {
  id: string;
  code: string;
  type: string; // 'percentage' | 'fixed'
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  includes_free_shipping?: boolean;
}

interface FreeShippingSettings {
  amount: number;
  enabled: boolean;
}

const Checkout = () => {
  const { t } = useTranslation('checkout');
  const { loadStripe } = useLazyStripe();
  const { cart } = useCart();
  const { formatPrice } = useCurrency();
  const { getCsrfHeaders, regenerateToken } = useCsrfToken();
  const { rules: businessRules } = useBusinessRules();

  // Guest session for GDPR-compliant tracking
  const { getSessionData: getGuestSessionData } = useGuestSession();

  // Checkout session tracking for admin visibility (persists to DB)
  const {
    sessionId: checkoutSessionId,
    savePersonalInfo,
    saveShippingInfo,
    savePromoCode,
    saveCartSnapshot,
    updateStep,
    isLoading: isSessionLoading,
  } = useCheckoutSession();

  // Use checkout form persistence hook for pre-filling and caching
  const {
    formData,
    setFormData,
    isLoading: isFormLoading,
    clearSavedData,
    savedStep,
    savedCompletedSteps,
    saveStepState,
    savedCoupon,
    saveCoupon,
  } = useCheckoutFormPersistence();

  // Initialize step from saved state
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Restore step state after form data is loaded
  useEffect(() => {
    if (!isFormLoading && !hasRestoredState) {
      if (savedStep > 1 && savedCompletedSteps.length > 0) {
        setStep(savedStep);
        setCompletedSteps(savedCompletedSteps);
      }
      if (savedCoupon) {
        setAppliedCoupon(savedCoupon);
      }
      setHasRestoredState(true);
    }
  }, [isFormLoading, hasRestoredState, savedStep, savedCompletedSteps, savedCoupon]);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Free shipping settings
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings>({
    amount: 100,
    enabled: true,
  });

  // Convert cart state items to the format expected by checkout
  const cartItems = cart.items.map((item) => ({
    product: item.product,
    quantity: item.quantity,
  }));

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Honeypot field for anti-bot protection
  const [honeypot, setHoneypot] = useState('');

  // Fetch free shipping settings
  useEffect(() => {
    const fetchFreeShippingSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'free_shipping_threshold')
          .maybeSingle();

        if (!error && data?.setting_value) {
          const settings = data.setting_value as unknown as FreeShippingSettings;
          setFreeShippingSettings(settings);
        }
      } catch (error) {
        console.error('Error fetching free shipping settings:', error);
      }
    };
    fetchFreeShippingSettings();
  }, []);

  // Track if payment was initiated (to prevent double submissions)
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentOpenedInTab, setPaymentOpenedInTab] = useState(false);

  // On mount: if returning from a payment redirect that completed, reset state
  useEffect(() => {
    const paymentPending = localStorage.getItem('checkout_payment_pending');
    if (paymentPending) {
      localStorage.removeItem('checkout_payment_pending');
      setIsProcessing(false);
      setPaymentInitiated(false);
    }
  }, []);

  // Reset processing state when user returns from payment tab
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
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [paymentOpenedInTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Handle input changes with sanitization
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { id, value } = e.target;
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      setFormData((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleClearError = useCallback((field: string) => {
    setFormErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Validate and apply promo code
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
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', sanitizedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setPromoError(t('promo.invalid'));
        setIsValidatingPromo(false);
        return;
      }

      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setPromoError(t('promo.invalid'));
        setIsValidatingPromo(false);
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setPromoError(t('promo.expired'));
        setIsValidatingPromo(false);
        return;
      }
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError(t('promo.limitReached'));
        setIsValidatingPromo(false);
        return;
      }
      if (data.minimum_order_amount && subtotal < data.minimum_order_amount) {
        setPromoError(t('promo.minOrder', { amount: formatPrice(data.minimum_order_amount) }));
        setIsValidatingPromo(false);
        return;
      }

      const coupon: DiscountCoupon = { ...data, type: data.type as 'percentage' | 'fixed' };
      setAppliedCoupon(coupon);
      saveCoupon(coupon as any);
      setPromoCode('');
      toast.success(t('promo.applied'));

      const discountApplied = coupon.type === 'percentage'
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

  const calculateDiscount = (): number => {
    if (!appliedCoupon) return 0;
    let discountVal = 0;
    if (appliedCoupon.type === 'percentage') {
      discountVal = (subtotal * appliedCoupon.value) / 100;
    } else {
      discountVal = appliedCoupon.value;
    }
    if (appliedCoupon.maximum_discount_amount && discountVal > appliedCoupon.maximum_discount_amount) {
      discountVal = appliedCoupon.maximum_discount_amount;
    }
    return Math.min(discountVal, subtotal);
  };

  // Navigate to next step
  const goToNextStep = useCallback(() => {
    setFormErrors({});

    if (honeypot) {
      console.warn('Bot detected via honeypot');
      toast.error(t('errors.genericError'));
      return;
    }

    let newCompletedSteps = [...completedSteps];

    if (step === 1) {
      const validation = validateCustomerInfo({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
      });
      if (!validation.success) {
        setFormErrors(validation.errors || {});
        toast.error(Object.values(validation.errors || {})[0] || t('errors.requiredField'));
        return;
      }
      const sanitizedData = {
        firstName: validation.data!.firstName,
        lastName: validation.data!.lastName,
        email: validation.data!.email,
        phone: validation.data!.phone || '',
      };
      setFormData((prev) => ({ ...prev, ...sanitizedData }));
      savePersonalInfo({
        first_name: sanitizedData.firstName,
        last_name: sanitizedData.lastName,
        email: sanitizedData.email,
        phone: sanitizedData.phone || undefined,
      });
      if (!newCompletedSteps.includes(1)) newCompletedSteps = [...newCompletedSteps, 1];
      setCompletedSteps(newCompletedSteps);
    } else if (step === 2) {
      const validation = validateShippingAddress({
        address: formData.address,
        addressComplement: formData.addressComplement || undefined,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
      });
      if (!validation.success) {
        setFormErrors(validation.errors || {});
        toast.error(Object.values(validation.errors || {})[0] || t('errors.requiredField'));
        return;
      }
      const sanitizedData = {
        address: validation.data!.address,
        addressComplement: validation.data!.addressComplement || '',
        postalCode: validation.data!.postalCode,
        city: validation.data!.city,
        country: validation.data!.country,
      };
      setFormData((prev) => ({ ...prev, ...sanitizedData }));
      saveShippingInfo({
        address_line1: sanitizedData.address,
        address_line2: sanitizedData.addressComplement || undefined,
        postal_code: sanitizedData.postalCode,
        city: sanitizedData.city,
        country: sanitizedData.country,
      });
      const cartSnapshot: CartItemSnapshot[] = cartItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Math.round(item.product.price * 100),
        total_price: Math.round(item.product.price * item.quantity * 100),
      }));
      saveCartSnapshot(cartSnapshot, Math.round(subtotal * 100), Math.round(shipping * 100), Math.round(total * 100));
      if (!newCompletedSteps.includes(2)) newCompletedSteps = [...newCompletedSteps, 2];
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
  }, [step, formData, honeypot, completedSteps, promoError, saveStepState, savePersonalInfo, saveShippingInfo, saveCartSnapshot, updateStep, cartItems, t]);

  const handleEditStep = useCallback(
    (targetStep: number) => {
      const newCompletedSteps = completedSteps.filter((s) => s < targetStep);
      setCompletedSteps(newCompletedSteps);
      setStep(targetStep);
      saveStepState(targetStep, newCompletedSteps);
    },
    [completedSteps, saveStepState]
  );

  // Process payment
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
        toast.error(t('promo.minOrder', { amount: formatPrice(minOrderAmount) }));
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
        toast.error(Object.values(fullValidation.errors || {})[0] || t('errors.requiredField'));
        setIsProcessing(false);
        return;
      }

      const sanitizedFormData = fullValidation.data!;

      const stockVerification = await stockService.reserveStock(
        cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity }))
      );

      if (!stockVerification.success) {
        const errors = stockVerification.errors || [];
        const errorMessages = errors
          .map((error) => `${cartItems.find((item) => item.product.id === error.productId)?.product.name}: ${error.error}`)
          .join('\n');
        toast.error(t('errors.stockError') + `:\n${errorMessages}`);
        setIsProcessing(false);
        return;
      }

      const csrfHeaders = await getCsrfHeaders();
      const guestSession = getGuestSessionData();
      const functionName = paymentMethod === 'paypal' ? 'create-paypal-payment' : 'create-payment';

      const { data, error } = await retryWithBackoff(
        async () => {
          const result = await supabase.functions.invoke(functionName, {
            body: {
              items: cartItems,
              customerInfo: sanitizedFormData,
              guestSession,
              discount: appliedCoupon
                ? {
                    couponId: appliedCoupon.id,
                    code: sanitizeUserInput(appliedCoupon.code),
                    amount: discount,
                    includesFreeShipping: appliedCoupon.includes_free_shipping || false,
                  }
                : null,
            },
            headers: {
              ...csrfHeaders,
              ...(checkoutSessionId ? { 'x-checkout-session-id': checkoutSessionId } : {}),
            },
          });
          if (result.error) {
            const msg = result.error.message || '';
            const isTransient = msg.includes('fetch') || msg.includes('network') || msg.includes('503') || msg.includes('502') || msg.includes('timeout');
            if (isTransient) throw result.error;
          }
          return result;
        },
        {
          maxAttempts: 2,
          baseDelayMs: 1000,
          onRetry: (attempt) => {
            toast.info('Nouvelle tentative de paiement...', { duration: 2000 });
          },
        }
      );

      if (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          toast.error(t('errors.rateLimited', 'Trop de tentatives. Veuillez patienter quelques minutes.'));
        } else if (errorMsg.includes('stock') || errorMsg.includes('indisponible') || errorMsg.includes('insuffisant')) {
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
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('introuvable') || errorMessage.includes('indisponible') || errorMessage.includes('insuffisant')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('Invalid email') || errorMessage.includes('invalide')) {
        toast.error(t('errors.invalidEmail', 'Veuillez vérifier vos informations.'));
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        toast.error(t('errors.networkError', 'Erreur réseau. Vérifiez votre connexion et réessayez.'));
      } else {
        toast.error(t('errors.paymentFailed'));
      }
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = calculateDiscount();
  const hasFreeShipping = appliedCoupon?.includes_free_shipping || (freeShippingSettings.enabled && subtotal >= freeShippingSettings.amount);
  const shippingCost = 6.95;
  const shipping = hasFreeShipping ? 0 : subtotal > 0 ? shippingCost : 0;
  const total = subtotal - discount + shipping;

  // Show empty cart message if no items
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHelmet
          title={t('payment.title') + ' - Rif Raw Straw'}
          description={t('payment.securePayment')}
          keywords={['paiement', 'checkout', 'commande sécurisée']}
          url="/checkout"
          type="website"
        />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center">
            {t('payment.title')}
          </h1>
          <div className="text-center">
            <p className="text-muted-foreground">{t('cart.empty')}</p>
            <Button className="mt-4" onClick={() => (window.location.href = '/products')}>
              {t('cart.continueShopping')}
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title={t('payment.title') + ' - Rif Raw Straw'}
        description={t('payment.securePayment')}
        keywords={['paiement sécurisé', 'checkout', 'commande', 'artisanat berbère']}
        url="/checkout"
        type="website"
      />
      <div className="container mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12">
        <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground mb-4 md:mb-8 text-center">
          {t('payment.title')}
        </h1>

        <CheckoutProgress
          currentStep={step}
          completedSteps={completedSteps}
          onStepClick={handleEditStep}
        />

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {/* Loading state */}
              {(isFormLoading || !hasRestoredState) && (
                <div className="space-y-6 animate-fade-in">
                  <Skeleton className="h-8 w-48" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-12 w-48" />
                </div>
              )}

              {!isFormLoading && hasRestoredState && step === 1 && (
                <CustomerInfoStep
                  formData={formData}
                  formErrors={formErrors}
                  honeypot={honeypot}
                  onFieldChange={handleFieldChange}
                  onClearError={handleClearError}
                  onHoneypotChange={setHoneypot}
                  onNext={goToNextStep}
                />
              )}

              {!isFormLoading && hasRestoredState && step === 2 && (
                <ShippingStep
                  formData={formData}
                  formErrors={formErrors}
                  onFieldChange={handleFieldChange}
                  onClearError={handleClearError}
                  onInputChange={handleInputChange}
                  onNext={goToNextStep}
                  onEditStep={handleEditStep}
                />
              )}

              {!isFormLoading && hasRestoredState && step === 3 && (
                <PaymentStep
                  formData={formData}
                  paymentMethod={paymentMethod}
                  total={total}
                  isProcessing={isProcessing}
                  onPaymentMethodChange={setPaymentMethod}
                  onPayment={handlePayment}
                  onEditStep={handleEditStep}
                />
              )}
            </div>

            {/* Order Summary */}
            <CheckoutOrderSummary
              cartItems={cartItems}
              subtotal={subtotal}
              discount={discount}
              shipping={shipping}
              total={total}
              hasFreeShipping={!!hasFreeShipping}
              shippingCost={shippingCost}
              freeShippingSettings={freeShippingSettings}
              appliedCoupon={appliedCoupon}
              promoCode={promoCode}
              promoError={promoError}
              isValidatingPromo={isValidatingPromo}
              onPromoCodeChange={(code) => {
                setPromoCode(code);
                setPromoError('');
              }}
              onValidatePromo={handleValidatePromoCode}
              onRemovePromo={removePromoCode}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 md:hidden safe-area z-50">
        <div className="flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => handleEditStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('cart.continueShopping').split(' ')[0]}
            </Button>
          ) : (
            <Button variant="outline" className="flex-1 min-h-[48px]" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('cart.title')}
            </Button>
          )}

          {step < 3 ? (
            <Button className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground" onClick={goToNextStep}>
              {t('cart.proceedToCheckout')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? t('payment.processing') : t('payment.payNow') + ` ${formatPrice(total)}`}
            </Button>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Checkout;
