import { ArrowLeft, CheckCircle, CreditCard, Tag, Loader2, X, Truck, AlertCircle, ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stripe } from "@stripe/stripe-js"; // Type import only
import { useEffect, useState, useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import PageFooter from "@/components/PageFooter";
import { STRIPE_PUBLIC_KEY } from "@/lib/stripe";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { stockService } from "@/services/stockService";
import { useLazyStripe } from "@/components/performance/LazyStripe";
import { useCart } from "@/stores";
import { 
  validateCustomerInfo, 
  validateShippingAddress, 
  validatePromoCode,
  validateCheckoutForm,
  getFieldError,
  type CheckoutFormData
} from "@/utils/checkoutValidation";
import { sanitizeUserInput } from "@/utils/xssProtection";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import CheckoutProgress from "@/components/checkout/CheckoutProgress";
import FormFieldWithValidation from "@/components/checkout/FormFieldWithValidation";
import StepSummary from "@/components/checkout/StepSummary";
import PaymentButton from "@/components/checkout/PaymentButton";

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
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const { loadStripe } = useLazyStripe();
  const { cart } = useCart();
  const { getCsrfHeaders, regenerateToken } = useCsrfToken();
  
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
  
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    addressComplement: string;
    postalCode: string;
    city: string;
    country: 'FR' | 'BE' | 'CH' | 'MC' | 'LU';
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    addressComplement: "",
    postalCode: "",
    city: "",
    country: "FR",
  });
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
      setPromoError(promoValidation.error || "Code promo invalide");
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
        .single();

      if (error || !data) {
        setPromoError("Code promo invalide ou expiré");
        setIsValidatingPromo(false);
        return;
      }

      // Check validity dates
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setPromoError("Ce code promo n'est pas encore actif");
        setIsValidatingPromo(false);
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setPromoError("Ce code promo a expiré");
        setIsValidatingPromo(false);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError("Ce code promo a atteint sa limite d'utilisation");
        setIsValidatingPromo(false);
        return;
      }

      // Check minimum order amount
      if (data.minimum_order_amount && subtotal < data.minimum_order_amount) {
        setPromoError(`Commande minimum de ${data.minimum_order_amount.toFixed(2)} € requise`);
        setIsValidatingPromo(false);
        return;
      }

      // Apply coupon
      setAppliedCoupon(data as DiscountCoupon);
      setPromoCode("");
      toast.success("Code promo appliqué !");
    } catch (err) {
      console.error("Error validating promo code:", err);
      setPromoError("Erreur lors de la validation du code");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Remove applied coupon
  const removePromoCode = () => {
    setAppliedCoupon(null);
    toast.info("Code promo retiré");
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
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    
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
        toast.error(firstError || "Veuillez corriger les erreurs du formulaire");
        return;
      }
      
      // Update formData with sanitized values
      setFormData(prev => ({
        ...prev,
        firstName: validation.data!.firstName,
        lastName: validation.data!.lastName,
        email: validation.data!.email,
        phone: validation.data!.phone || '',
      }));
      
      // Mark step as completed
      setCompletedSteps(prev => prev.includes(1) ? prev : [...prev, 1]);
      
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
        toast.error(firstError || "Veuillez corriger les erreurs du formulaire");
        return;
      }
      
      // Update formData with sanitized values
      setFormData(prev => ({
        ...prev,
        address: validation.data!.address,
        addressComplement: validation.data!.addressComplement || '',
        postalCode: validation.data!.postalCode,
        city: validation.data!.city,
        country: validation.data!.country,
      }));
      
      // Mark step as completed
      setCompletedSteps(prev => prev.includes(2) ? prev : [...prev, 2]);
    }
    
    // Proceed to next step
    setStep(step + 1);
  }, [step, formData, honeypot]);

  // Handle editing a previous step
  const handleEditStep = useCallback((targetStep: number) => {
    // Remove completion status for this step and subsequent steps
    setCompletedSteps(prev => prev.filter(s => s < targetStep));
    setStep(targetStep);
  }, []);

  // Process payment with full validation
  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      
      // Anti-bot check
      if (honeypot) {
        console.warn("Bot detected via honeypot");
        toast.error("Une erreur est survenue. Veuillez réessayer.");
        setIsProcessing(false);
        return;
      }
      
      // Final validation of all form data before payment
      const fullValidation = validateCheckoutForm(formData);
      if (!fullValidation.success) {
        setFormErrors(fullValidation.errors || {});
        const firstError = Object.values(fullValidation.errors || {})[0];
        toast.error(firstError || "Veuillez vérifier vos informations");
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
        
        toast.error(`Stock insuffisant:\n${errorMessages}`);
        setIsProcessing(false);
        return;
      }

      // Get CSRF headers for secure request
      const csrfHeaders = await getCsrfHeaders();
      
      // Call Supabase edge function to create Stripe checkout session with sanitized data
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: cartItems,
          customerInfo: sanitizedFormData,
          discount: appliedCoupon ? {
            couponId: appliedCoupon.id,
            code: sanitizeUserInput(appliedCoupon.code),
            amount: discount
          } : null
        },
        headers: csrfHeaders
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }

    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors du paiement");
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
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center">
            Paiement
          </h1>
          <div className="text-center">
            <p className="text-muted-foreground">Votre panier est vide</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = '/products'}
            >
              Voir nos produits
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-8 text-center">
          Paiement sécurisé
        </h1>

        {/* Enhanced Checkout Progress */}
        <CheckoutProgress currentStep={step} completedSteps={completedSteps} />

        {/* Main Checkout Container */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form Section */}
            <div className="lg:col-span-2">
              {step === 1 && (
                <fieldset className="space-y-6 animate-fade-in">
                  <legend className="text-xl font-medium mb-4">Vos Coordonnées</legend>
                  
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
                      label="Prénom"
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
                      placeholder="Votre prénom"
                      required
                      autoComplete="given-name"
                      maxLength={50}
                      validate={(value) => {
                        if (value.length < 2) return "Le prénom doit contenir au moins 2 caractères";
                        if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return "Caractères non autorisés";
                        return null;
                      }}
                    />

                    <FormFieldWithValidation
                      id="lastName"
                      label="Nom"
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
                      placeholder="Votre nom"
                      required
                      autoComplete="family-name"
                      maxLength={50}
                      validate={(value) => {
                        if (value.length < 2) return "Le nom doit contenir au moins 2 caractères";
                        if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return "Caractères non autorisés";
                        return null;
                      }}
                    />
                  </div>

                  <FormFieldWithValidation
                    id="email"
                    label="Email"
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
                    placeholder="votre.email@exemple.com"
                    required
                    autoComplete="email"
                    maxLength={254}
                    helpText="Nous vous enverrons la confirmation de commande à cette adresse"
                    validate={(value) => {
                      if (!value.includes('@')) return "Adresse email invalide";
                      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                        return "Format d'email invalide";
                      }
                      return null;
                    }}
                  />

                  <FormFieldWithValidation
                    id="phone"
                    label="Téléphone"
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
                    helpText="Pour vous contacter en cas de problème avec votre commande"
                    showSuccessState={false}
                    validate={(value) => {
                      if (!value) return null; // Optional field
                      if (!/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(value)) {
                        return "Format de téléphone invalide";
                      }
                      return null;
                    }}
                  />

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    onClick={goToNextStep}
                    aria-describedby="step1-instructions"
                  >
                    Continuer vers la livraison
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p id="step1-instructions" className="sr-only">
                    Passer à l'étape suivante pour saisir votre adresse de livraison
                  </p>
                </fieldset>
              )}

              {step === 2 && (
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
                      <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                    </button>
                    <h2 className="text-xl font-medium ml-4">
                      Adresse de Livraison
                    </h2>
                  </div>

                  <FormFieldWithValidation
                    id="address"
                    label="Adresse"
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
                    placeholder="Numéro et nom de rue"
                    required
                    autoComplete="street-address"
                    maxLength={200}
                    validate={(value) => {
                      if (value.length < 5) return "L'adresse doit contenir au moins 5 caractères";
                      return null;
                    }}
                  />

                  <FormFieldWithValidation
                    id="addressComplement"
                    label="Complément d'adresse"
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
                    placeholder="Appartement, étage, code d'entrée..."
                    autoComplete="address-line2"
                    maxLength={100}
                    showSuccessState={false}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormFieldWithValidation
                      id="postalCode"
                      label="Code postal"
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
                      placeholder="75001"
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
                          return `Code postal invalide pour ${formData.country === 'FR' ? 'la France' : formData.country}`;
                        }
                        return null;
                      }}
                    />

                    <div className="md:col-span-2">
                      <FormFieldWithValidation
                        id="city"
                        label="Ville"
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
                        placeholder="Paris"
                        required
                        autoComplete="address-level2"
                        maxLength={100}
                        validate={(value) => {
                          if (value.length < 2) return "La ville doit contenir au moins 2 caractères";
                          if (!/^[a-zA-ZÀ-ÿ\s\-'\.]+$/.test(value)) return "Caractères non autorisés";
                          return null;
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays *</Label>
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
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    onClick={goToNextStep}
                  >
                    Continuer vers le paiement
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 3 && (
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
                      <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                    </button>
                    <h2 className="text-xl font-medium ml-4">
                      Méthode de Paiement
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
                            <CreditCard className="mr-2 h-5 w-5" /> Carte bancaire
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Visa, Mastercard, American Express
                          </p>
                          {paymentMethod === "card" && (
                            <p className="text-xs text-primary mt-2 animate-fade-in">
                              Vous serez redirigé vers notre page de paiement sécurisée Stripe
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
                  Récapitulatif de la commande
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
                          Quantité: {item.quantity}
                        </div>
                      </div>
                      <div className="text-primary font-medium">
                        {item.product.price} €
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Promo Code Section */}
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Code promo
                  </Label>
                  
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-md p-3 mt-2">
                      <div>
                        <span className="font-medium text-primary">{appliedCoupon.code}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {appliedCoupon.type === 'percentage' 
                            ? `-${appliedCoupon.value}%` 
                            : `-${appliedCoupon.value.toFixed(2)} €`}
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
                        placeholder="Entrez votre code"
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
                          "Appliquer"
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
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="font-medium">{subtotal.toFixed(2)} €</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Réduction</span>
                      <span className="font-medium">-{discount.toFixed(2)} €</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frais de livraison</span>
                    {hasFreeShipping ? (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground line-through text-sm">{shippingCost.toFixed(2)} €</span>
                        <span className="font-medium text-primary flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          Gratuit
                        </span>
                      </div>
                    ) : (
                      <span className="font-medium">{shipping.toFixed(2)} €</span>
                    )}
                  </div>
                  
                  {/* Free shipping progress hint */}
                  {!hasFreeShipping && freeShippingSettings.enabled && subtotal > 0 && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                      <Truck className="h-3 w-3 inline mr-1" />
                      Plus que {(freeShippingSettings.amount - subtotal).toFixed(2)} € pour la livraison gratuite !
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Total</span>
                    <span className="font-medium text-primary">
                      {total.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-background p-3 rounded-md border border-border mt-6">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>Paiement 100% sécurisé</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default Checkout;
