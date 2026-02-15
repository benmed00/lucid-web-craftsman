import { ArrowLeft, CheckCircle, CreditCard, Tag, Loader2, X, Truck, AlertCircle, ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stripe } from "@stripe/stripe-js"; // Type import only
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import PageFooter from "@/components/PageFooter";
import SEOHelmet from "@/components/seo/SEOHelmet";
import { STRIPE_PUBLIC_KEY } from "@/lib/stripe";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { stockService } from "@/services/stockService";
import { useLazyStripe } from "@/components/performance/LazyStripe";
import { useCart } from "@/stores";
import { useCurrency } from "@/stores/currencyStore";
import { 
  validateCustomerInfo, 
  validateShippingAddress, 
  validatePromoCode,
  validateCheckoutForm,
  getFieldError,
  type CheckoutFormData
} from "@/utils/checkoutValidation";
import { sanitizeUserInput } from "@/utils/xssProtection";
import { retryWithBackoff } from "@/lib/retryWithBackoff";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { useBusinessRules } from "@/hooks/useBusinessRules";
import { useCheckoutFormPersistence } from "@/hooks/useCheckoutFormPersistence";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useCheckoutSession, type PersonalInfo, type ShippingInfo, type CartItemSnapshot } from "@/hooks/useCheckoutSession";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import FormFieldWithValidation from "@/components/checkout/FormFieldWithValidation";
import StepSummary from "@/components/checkout/StepSummary";
import PaymentButton from "@/components/checkout/PaymentButton";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy initialize Stripe only when needed
let _stripePromise: Promise<Stripe | null> | null = null;

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
  const { t } = useTranslation("checkout");
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
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Restore step state after form data is loaded
  useEffect(() => {
    if (!isFormLoading && !hasRestoredState) {
      // Only restore if we have saved data and completed steps
      if (savedStep > 1 && savedCompletedSteps.length > 0) {
        setStep(savedStep);
        setCompletedSteps(savedCompletedSteps);
      }
      // Restore saved coupon if exists
      if (savedCoupon) {
        setAppliedCoupon(savedCoupon);
      }
      setHasRestoredState(true);
    }
  }, [isFormLoading, hasRestoredState, savedStep, savedCompletedSteps, savedCoupon]);
  
  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  
  // Free shipping settings
  const [freeShippingSettings, setFreeShippingSettings] = useState<FreeShippingSettings>({
    amount: 100,
    enabled: true
  });
  
  // Convert cart state items to the format expected by checkout
  const cartItems = cart.items.map(item => ({
    product: item.product,
    quantity: item.quantity
  }));
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Honeypot field for anti-bot protection
  const [honeypot, setHoneypot] = useState("");

  // Memoized customer and shipping data for summary
  const customerData = useMemo(() => ({
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
  }), [formData.firstName, formData.lastName, formData.email, formData.phone]);

  const shippingData = useMemo(() => ({
    address: formData.address,
    addressComplement: formData.addressComplement,
    postalCode: formData.postalCode,
    city: formData.city,
    country: formData.country,
  }), [formData.address, formData.addressComplement, formData.postalCode, formData.city, formData.country]);

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
        console.error("Error fetching free shipping settings:", error);
      }
    };
    
    fetchFreeShippingSettings();
  }, []);

  // Track if payment was initiated (to prevent double submissions)
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  // Track if payment was opened in a new tab (Stripe or PayPal)
  const [paymentOpenedInTab, setPaymentOpenedInTab] = useState(false);

  // On mount: if returning from a payment redirect that completed, reset state
  useEffect(() => {
    const paymentPending = localStorage.getItem('checkout_payment_pending');
    if (paymentPending) {
      // User navigated back to checkout — clear the flag and reset state
      localStorage.removeItem('checkout_payment_pending');
      setIsProcessing(false);
      setPaymentInitiated(false);
    }
  }, []);

  // Reset processing state when user returns from payment tab (Stripe or PayPal)
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
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    // Clear error for this field when user starts typing
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  // Validate and apply promo code with Zod validation
  const handleValidatePromoCode = async () => {
    // First validate the promo code format
    const promoValidation = validatePromoCode(promoCode);
    if (!promoValidation.success) {
      setPromoError(promoValidation.error || t("promo.invalid"));
      return;
    }

    const sanitizedCode = promoValidation.data!;
    setIsValidatingPromo(true);
    setPromoError("");

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', sanitizedCode)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setPromoError(t("promo.invalid"));
        setIsValidatingPromo(false);
        return;
      }

      // Check validity dates
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setPromoError(t("promo.invalid"));
        setIsValidatingPromo(false);
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setPromoError(t("promo.expired"));
        setIsValidatingPromo(false);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError(t("promo.limitReached"));
        setIsValidatingPromo(false);
        return;
      }

      // Check minimum order amount
      if (data.minimum_order_amount && subtotal < data.minimum_order_amount) {
        setPromoError(t("promo.minOrder", { amount: formatPrice(data.minimum_order_amount) }));
        setIsValidatingPromo(false);
        return;
      }

      // Apply coupon
      const coupon: DiscountCoupon = {
        ...data,
        type: data.type as 'percentage' | 'fixed'
      };
      setAppliedCoupon(coupon);
      saveCoupon(coupon as any); // Persist coupon for Stripe redirect
      setPromoCode("");
      toast.success(t("promo.applied"));
      
      // Save promo code to checkout session for admin visibility
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
      console.error("Error validating promo code:", err);
      setPromoError(t("errors.genericError"));
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Remove applied coupon
  const removePromoCode = () => {
    setAppliedCoupon(null);
    saveCoupon(null); // Clear persisted coupon
    savePromoCode(null); // Clear from checkout session
    toast.info(t("promo.remove"));
  };

  // Calculate discount amount
  const calculateDiscount = (): number => {
    if (!appliedCoupon) return 0;

    let discount = 0;
    if (appliedCoupon.type === 'percentage') {
      discount = (subtotal * appliedCoupon.value) / 100;
    } else {
      discount = appliedCoupon.value;
    }

    // Apply maximum discount limit if set
    if (appliedCoupon.maximum_discount_amount && discount > appliedCoupon.maximum_discount_amount) {
      discount = appliedCoupon.maximum_discount_amount;
    }

    // Don't exceed subtotal
    return Math.min(discount, subtotal);
  };

  // Navigate to next step if form is valid with Zod validation
  const goToNextStep = useCallback(() => {
    // Clear previous errors
    setFormErrors({});
    
    // Anti-bot check: if honeypot is filled, silently fail
    if (honeypot) {
      console.warn("Bot detected via honeypot");
      toast.error(t("errors.genericError"));
      return;
    }
    
    let newCompletedSteps = [...completedSteps];
    
    if (step === 1) {
      // Validate customer information with Zod
      const validation = validateCustomerInfo({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
      });
      
      if (!validation.success) {
        setFormErrors(validation.errors || {});
        const firstError = Object.values(validation.errors || {})[0];
        toast.error(firstError || t("errors.requiredField"));
        return;
      }
      
      // Update formData with sanitized values
      const sanitizedData = {
        firstName: validation.data!.firstName,
        lastName: validation.data!.lastName,
        email: validation.data!.email,
        phone: validation.data!.phone || '',
      };
      
      setFormData(prev => ({ ...prev, ...sanitizedData }));
      
      // Save personal info to checkout session (database persistence for admin)
      savePersonalInfo({
        first_name: sanitizedData.firstName,
        last_name: sanitizedData.lastName,
        email: sanitizedData.email,
        phone: sanitizedData.phone || undefined,
      });
      
      // Mark step as completed
      if (!newCompletedSteps.includes(1)) {
        newCompletedSteps = [...newCompletedSteps, 1];
      }
      setCompletedSteps(newCompletedSteps);
      
    } else if (step === 2) {
      // Validate shipping address with Zod
      const validation = validateShippingAddress({
        address: formData.address,
        addressComplement: formData.addressComplement || undefined,
        postalCode: formData.postalCode,
        city: formData.city,
        country: formData.country,
      });
      
      if (!validation.success) {
        setFormErrors(validation.errors || {});
        const firstError = Object.values(validation.errors || {})[0];
        toast.error(firstError || t("errors.requiredField"));
        return;
      }
      
      // Update formData with sanitized values
      const sanitizedData = {
        address: validation.data!.address,
        addressComplement: validation.data!.addressComplement || '',
        postalCode: validation.data!.postalCode,
        city: validation.data!.city,
        country: validation.data!.country,
      };
      
      setFormData(prev => ({ ...prev, ...sanitizedData }));
      
      // Save shipping info to checkout session (database persistence for admin)
      saveShippingInfo({
        address_line1: sanitizedData.address,
        address_line2: sanitizedData.addressComplement || undefined,
        postal_code: sanitizedData.postalCode,
        city: sanitizedData.city,
        country: sanitizedData.country,
      });
      
      // Save cart snapshot for admin visibility
      const cartSnapshot: CartItemSnapshot[] = cartItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Math.round(item.product.price * 100),
        total_price: Math.round(item.product.price * item.quantity * 100),
      }));
      const discountCents = Math.round(discount * 100);
      const subtotalCents = Math.round(subtotal * 100);
      const shippingCents = Math.round(shipping * 100);
      const totalCents = Math.round(total * 100);
      saveCartSnapshot(cartSnapshot, subtotalCents, shippingCents, totalCents);
      
      // Mark step as completed
      if (!newCompletedSteps.includes(2)) {
        newCompletedSteps = [...newCompletedSteps, 2];
      }
      setCompletedSteps(newCompletedSteps);
    }
    
    // Proceed to next step and save state
    const nextStep = step + 1;
    setStep(nextStep);
    saveStepState(nextStep, newCompletedSteps);
    
    // Auto-clear invalid promo code when navigating steps
    if (promoError) {
      setPromoCode('');
      setPromoError('');
    }
    
    // Update checkout session step tracking
    updateStep(nextStep, Math.max(...newCompletedSteps, 0));
  }, [step, formData, honeypot, completedSteps, promoError, saveStepState, savePersonalInfo, saveShippingInfo, saveCartSnapshot, updateStep, cartItems, t]);

  // Handle editing a previous step
  const handleEditStep = useCallback((targetStep: number) => {
    // Remove completion status for this step and subsequent steps
    const newCompletedSteps = completedSteps.filter(s => s < targetStep);
    setCompletedSteps(newCompletedSteps);
    setStep(targetStep);
    saveStepState(targetStep, newCompletedSteps);
  }, [completedSteps, saveStepState]);

  // Process payment with full validation
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      // Anti-bot check
      if (honeypot) {
        console.warn("Bot detected via honeypot");
        toast.error(t("errors.genericError"));
        setIsProcessing(false);
        return;
      }

      // Validate order amount against business rules
      const { minOrderAmount, maxOrderAmount, highValueThreshold } = businessRules.cart;
      
      if (minOrderAmount > 0 && subtotal < minOrderAmount) {
        toast.error(t("promo.minOrder", { amount: formatPrice(minOrderAmount) }));
        setIsProcessing(false);
        return;
      }
      
      if (maxOrderAmount > 0 && subtotal > maxOrderAmount) {
        toast.error(t("errors.genericError"));
        setIsProcessing(false);
        return;
      }
      
      // Final validation of all form data before payment
      const fullValidation = validateCheckoutForm(formData);
      if (!fullValidation.success) {
        setFormErrors(fullValidation.errors || {});
        const firstError = Object.values(fullValidation.errors || {})[0];
        toast.error(firstError || t("errors.requiredField"));
        setIsProcessing(false);
        return;
      }
      
      const sanitizedFormData = fullValidation.data!;

      // Verify stock availability for all items before payment
      const stockVerification = await stockService.reserveStock(
        cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      );

      if (!stockVerification.success) {
        const errors = stockVerification.errors || [];
        const errorMessages = errors.map(error => 
          `${cartItems.find(item => item.product.id === error.productId)?.product.name}: ${error.error}`
        ).join('\n');
        
        toast.error(t("errors.stockError") + `:\n${errorMessages}`);
        setIsProcessing(false);
        return;
      }

      // Get CSRF headers for secure request
      const csrfHeaders = await getCsrfHeaders();
      
      // Get guest session data for GDPR-compliant tracking
      const guestSession = getGuestSessionData();
      
      // Determine which edge function to call based on payment method
      const functionName = paymentMethod === "paypal" ? "create-paypal-payment" : "create-payment";
      
      // Call appropriate edge function with retry for transient failures
      const { data, error } = await retryWithBackoff(
        async () => {
          const result = await supabase.functions.invoke(functionName, {
            body: {
              items: cartItems,
              customerInfo: sanitizedFormData,
              guestSession,
              discount: appliedCoupon ? {
                couponId: appliedCoupon.id,
                code: sanitizeUserInput(appliedCoupon.code),
                amount: discount,
                includesFreeShipping: appliedCoupon.includes_free_shipping || false
              } : null
            },
            headers: {
              ...csrfHeaders,
              ...(checkoutSessionId ? { 'x-checkout-session-id': checkoutSessionId } : {}),
            }
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
            console.warn(`[Checkout] Payment retry #${attempt}`);
          },
        }
      );

      if (error) {
        // Categorize error for user-friendly messaging
        const errorMsg = error.message || '';
        if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          toast.error(t("errors.rateLimited", "Trop de tentatives. Veuillez patienter quelques minutes."));
        } else if (errorMsg.includes('stock') || errorMsg.includes('indisponible') || errorMsg.includes('insuffisant')) {
          toast.error(errorMsg);
        } else {
          throw new Error(errorMsg);
        }
        setIsProcessing(false);
        return;
      }

      if (data?.url) {
        // Mark payment as initiated and persist flag for cross-page state
        setPaymentInitiated(true);
        localStorage.setItem('checkout_payment_pending', 'true');
        // Redirect to Stripe/PayPal Checkout
        // Use window.top to escape iframe (Lovable preview), fallback to window.location
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          // Cross-origin iframe restriction — open in new tab as fallback
          window.open(data.url, '_blank');
          // Mark that payment was opened in a new tab so we can reset on return
          setPaymentOpenedInTab(true);
        }
      } else {
        throw new Error("No checkout URL received");
      }

    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Distinguish error types for user messaging
      if (errorMessage.includes('introuvable') || errorMessage.includes('indisponible') || errorMessage.includes('insuffisant')) {
        toast.error(errorMessage); // Show exact product error
      } else if (errorMessage.includes('Invalid email') || errorMessage.includes('invalide')) {
        toast.error(t("errors.invalidEmail", "Veuillez vérifier vos informations."));
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        toast.error(t("errors.networkError", "Erreur réseau. Vérifiez votre connexion et réessayez."));
      } else {
        toast.error(t("errors.paymentFailed"));
      }
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discount = calculateDiscount();
  
  // Check if free shipping applies
  const hasFreeShipping = 
    // Coupon includes free shipping
    appliedCoupon?.includes_free_shipping ||
    // Or subtotal exceeds threshold
    (freeShippingSettings.enabled && subtotal >= freeShippingSettings.amount);
  
  const shippingCost = 6.95;
  const shipping = hasFreeShipping ? 0 : (subtotal > 0 ? shippingCost : 0);
  const total = subtotal - discount + shipping;

  // Show empty cart message if no items
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHelmet
          title={t("payment.title") + " - Rif Raw Straw"}
          description={t("payment.securePayment")}
          keywords={["paiement", "checkout", "commande sécurisée"]}
          url="/checkout"
          type="website"
        />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center">
            {t("payment.title")}
          </h1>
          <div className="text-center">
            <p className="text-muted-foreground">{t("cart.empty")}</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/products'}
            >
              {t("cart.continueShopping")}
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
        title={t("payment.title") + " - Rif Raw Straw"}
        description={t("payment.securePayment")}
        keywords={["paiement sécurisé", "checkout", "commande", "artisanat berbère"]}
        url="/checkout"
        type="website"
      />
      <div className="container mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12">
        <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground mb-4 md:mb-8 text-center">
          {t("payment.title")}
        </h1>

        {/* Enhanced Checkout Progress - Clickable steps */}
        <CheckoutProgress 
          currentStep={step} 
          completedSteps={completedSteps} 
          onStepClick={handleEditStep}
        />

        {/* Main Checkout Container */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {/* Loading state for form data - show while restoring state */}
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
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-12 w-48" />
                </div>
              )}

              {!isFormLoading && hasRestoredState && step === 1 && (
                <fieldset className="space-y-6 animate-fade-in">
                  <legend className="text-xl font-medium mb-4">{t("steps.information")}</legend>
                  
                  {/* Honeypot field - hidden from real users */}
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormFieldWithValidation
                      id="firstName"
                      label={t("form.firstName")}
                      value={formData.firstName}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, firstName: value }));
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.firstName;
                          return newErrors;
                        });
                      }}
                      error={formErrors.firstName}
                      placeholder={t("form.firstName")}
                      required
                      autoComplete="given-name"
                      maxLength={50}
                      validate={(value) => {
                        if (value.length < 2) return t("errors.requiredField");
                        if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return t("errors.requiredField");
                        return null;
                      }}
                    />

                    <FormFieldWithValidation
                      id="lastName"
                      label={t("form.lastName")}
                      value={formData.lastName}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, lastName: value }));
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.lastName;
                          return newErrors;
                        });
                      }}
                      error={formErrors.lastName}
                      placeholder={t("form.lastName")}
                      required
                      autoComplete="family-name"
                      maxLength={50}
                      validate={(value) => {
                        if (value.length < 2) return t("errors.requiredField");
                        if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return t("errors.requiredField");
                        return null;
                      }}
                    />
                  </div>

                  <FormFieldWithValidation
                    id="email"
                    label={t("form.email")}
                    type="email"
                    value={formData.email}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, email: value }));
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }}
                    error={formErrors.email}
                    placeholder="email@example.com"
                    required
                    autoComplete="email"
                    maxLength={254}
                    validate={(value) => {
                      if (!value.includes('@')) return t("errors.invalidEmail");
                      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                        return t("errors.invalidEmail");
                      }
                      return null;
                    }}
                  />

                  <FormFieldWithValidation
                    id="phone"
                    label={t("form.phone")}
                    type="tel"
                    value={formData.phone}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, phone: value }));
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.phone;
                        return newErrors;
                      });
                    }}
                    error={formErrors.phone}
                    placeholder="+33 6 12 34 56 78"
                    autoComplete="tel"
                    maxLength={20}
                    showSuccessState={false}
                    validate={(value) => {
                      if (!value) return null; // Optional field
                      if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(value)) {
                        return t("errors.invalidPhone");
                      }
                      return null;
                    }}
                  />

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[48px] text-base"
                    onClick={goToNextStep}
                    aria-describedby="step1-instructions"
                  >
                    {t("steps.shipping")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p id="step1-instructions" className="sr-only">
                    {t("steps.shipping")}
                  </p>
                </fieldset>
              )}

              {!isFormLoading && hasRestoredState && step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Step summary */}
                  <StepSummary
                    step={step}
                    customerData={customerData}
                    onEditStep={handleEditStep}
                  />

                  <div className="flex items-center mb-2">
                    <button
                      className="text-primary hover:text-primary/80 flex items-center text-sm"
                      onClick={() => handleEditStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> {t("cart.continueShopping").split(' ')[0]}
                    </button>
                    <h2 className="text-xl font-medium ml-4">
                      {t("shipping.title")}
                    </h2>
                  </div>

                  <FormFieldWithValidation
                    id="address"
                    label={t("form.address")}
                    value={formData.address}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, address: value }));
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.address;
                        return newErrors;
                      });
                    }}
                    error={formErrors.address}
                    placeholder={t("form.address")}
                    required
                    autoComplete="street-address"
                    maxLength={200}
                    validate={(value) => {
                      if (value.length < 5) return t("errors.requiredField");
                      return null;
                    }}
                  />

                  <FormFieldWithValidation
                    id="addressComplement"
                    label={t("form.addressLine2")}
                    value={formData.addressComplement}
                    onChange={(value) => {
                      setFormData(prev => ({ ...prev, addressComplement: value }));
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.addressComplement;
                        return newErrors;
                      });
                    }}
                    error={formErrors.addressComplement}
                    placeholder={t("form.addressLine2")}
                    autoComplete="address-line2"
                    maxLength={100}
                    showSuccessState={false}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormFieldWithValidation
                      id="postalCode"
                      label={t("form.postalCode")}
                      value={formData.postalCode}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, postalCode: value }));
                        setFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.postalCode;
                          return newErrors;
                        });
                      }}
                      error={formErrors.postalCode}
                      placeholder={formData.country === 'BE' || formData.country === 'CH' || formData.country === 'LU' ? "1000" : "ex: 75001"}
                      required
                      autoComplete="postal-code"
                      maxLength={10}
                      validate={(value) => {
                        const countryPatterns: Record<string, RegExp> = {
                          FR: /^\d{5}$/,
                          BE: /^\d{4}$/,
                          CH: /^\d{4}$/,
                          MC: /^\d{5}$/,
                          LU: /^\d{4}$/,
                        };
                        const pattern = countryPatterns[formData.country];
                        if (pattern && !pattern.test(value)) {
                          return t("errors.invalidPostalCode");
                        }
                        return null;
                      }}
                    />
                    {/* Postal code format hint */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.country === 'FR' || formData.country === 'MC'
                        ? '5 chiffres (ex: 75001)'
                        : formData.country === 'BE' || formData.country === 'LU'
                          ? '4 chiffres (ex: 1000)'
                          : formData.country === 'CH'
                            ? '4 chiffres (ex: 1200)'
                            : ''}
                    </p>

                    <div className="md:col-span-2">
                      <FormFieldWithValidation
                        id="city"
                        label={t("form.city")}
                        value={formData.city}
                        onChange={(value) => {
                          setFormData(prev => ({ ...prev, city: value }));
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.city;
                            return newErrors;
                          });
                        }}
                        error={formErrors.city}
                        placeholder={t("form.city")}
                        required
                        autoComplete="address-level2"
                        maxLength={100}
                        validate={(value) => {
                          if (value.length < 2) return t("errors.requiredField");
                          if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return t("errors.requiredField");
                          return null;
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">{t("form.country")} *</Label>
                    <select
                      id="country"
                      className={`w-full h-10 px-3 py-2 border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                        formErrors.country ? "border-destructive" : "border-border"
                      }`}
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="FR">🇫🇷 France</option>
                      <option value="BE">🇧🇪 Belgique</option>
                      <option value="CH">🇨🇭 Suisse</option>
                      <option value="MC">🇲🇨 Monaco</option>
                      <option value="LU">🇱🇺 Luxembourg</option>
                    </select>
                    {formErrors.country && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.country}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[48px] text-base"
                    onClick={goToNextStep}
                  >
                    {t("steps.payment")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!isFormLoading && hasRestoredState && step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Step summaries */}
                  <StepSummary
                    step={step}
                    customerData={customerData}
                    shippingData={shippingData}
                    onEditStep={handleEditStep}
                  />

                  <div className="flex items-center mb-2">
                    <button
                      className="text-primary hover:text-primary/80 flex items-center text-sm"
                      onClick={() => handleEditStep(2)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> {t("cart.continueShopping").split(' ')[0]}
                    </button>
                    <h2 className="text-xl font-medium ml-4">
                      {t("payment.title")}
                    </h2>
                  </div>

                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-4"
                  >
                    <div
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setPaymentMethod("card")}
                    >
                      <div className="flex items-start">
                        <RadioGroupItem
                          value="card"
                          id="card"
                          className="mt-1"
                        />
                        <div className="ml-3 flex-1">
                          <Label
                            htmlFor="card"
                            className="text-lg flex items-center cursor-pointer"
                          >
                            <CreditCard className="mr-2 h-5 w-5" /> {t("payment.payNow")}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Visa, Mastercard, American Express
                          </p>
                          {paymentMethod === "card" && (
                            <p className="text-xs text-primary mt-2 animate-fade-in">
                              {t("payment.redirecting")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        paymentMethod === "paypal"
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setPaymentMethod("paypal")}
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="ml-3 text-lg cursor-pointer">
                          PayPal
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  <PaymentButton
                    total={total}
                    isProcessing={isProcessing}
                    onClick={handlePayment}
                  />
                </div>
              )}
            </div>

            {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="border border-border rounded-lg p-6 bg-secondary sticky top-8">
                <h3 className="font-serif text-xl text-foreground mb-4">
                  {t("cart.title")}
                </h3>

                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item, index) => (
                    <div key={item.product.id || index} className="flex items-center">
                      <div className="w-16 h-16 rounded-md overflow-hidden mr-4 bg-background border border-border">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t("cart.updateQuantity")}: {item.quantity}
                        </div>
                      </div>
                      <div className="text-primary font-medium">
                        {formatPrice(item.product.price)}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Promo Code Section */}
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    {t("promo.label")}
                  </Label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-md p-3 mt-2">
                      <div>
                        <span className="font-medium text-primary">{appliedCoupon.code}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {appliedCoupon.type === 'percentage' 
                            ? `-${appliedCoupon.value}%` 
                            : `-${formatPrice(appliedCoupon.value)}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={removePromoCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder={t("promo.placeholder")}
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoError("");
                        }}
                        className="flex-1 uppercase"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleValidatePromoCode();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleValidatePromoCode}
                        disabled={isValidatingPromo || !promoCode.trim()}
                        className="shrink-0"
                      >
                        {isValidatingPromo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("promo.apply")
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {promoError && (
                    <p className="text-xs text-destructive mt-1">{promoError}</p>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Order Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>{t("cart.discount")}</span>
                      <span className="font-medium">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("cart.shipping")}</span>
                    {hasFreeShipping ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-sm">{formatPrice(shippingCost)}</span>
                        <span className="font-medium text-primary flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {t("cart.shippingFree")}
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium">{formatPrice(shipping)}</span>
                    )}
                  </div>
                  
                  {/* Free shipping progress hint */}
                  {!hasFreeShipping && freeShippingSettings.enabled && subtotal > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                      <Truck className="h-3 w-3 inline mr-1" />
                      {t("shipping.freeFrom", { amount: formatPrice(freeShippingSettings.amount - subtotal) })}
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">{t("cart.total")}</span>
                    <span className="font-medium text-primary">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-background p-3 rounded-md border border-border mt-6">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>{t("payment.securePayment")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar for navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4 md:hidden safe-area z-50">
        <div className="flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={() => handleEditStep(step - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("cart.continueShopping").split(' ')[0]}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="flex-1 min-h-[48px]"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("cart.title")}
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={goToNextStep}
            >
              {t("cart.proceedToCheckout")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="flex-1 min-h-[48px] bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? t("payment.processing") : t("payment.payNow") + ` ${formatPrice(total)}`}
            </Button>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Checkout;
