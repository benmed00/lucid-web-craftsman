import { ArrowLeft, CheckCircle, CreditCard, Tag, Loader2, X, Truck, AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stripe } from "@stripe/stripe-js"; // Type import only
import { useEffect, useState, useCallback } from "react";

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
import { useCart } from "@/context/CartContext";
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
    }
    
    // Proceed to next step
    setStep(step + 1);
  }, [step, formData, honeypot]);

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
          Paiement
        </h1>

        {/* Checkout Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex justify-between">
            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <div className="mt-2 text-sm font-medium">Information</div>
            </div>

            <div className="w-full max-w-[100px] flex items-center">
              <div
                className={`h-1 w-full ${
                  step >= 2 ? "bg-primary" : "bg-muted"
                }`}
              ></div>
            </div>

            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <div className="mt-2 text-sm font-medium">Livraison</div>
            </div>

            <div className="w-full max-w-[100px] flex items-center">
              <div
                className={`h-1 w-full ${
                  step >= 3 ? "bg-primary" : "bg-muted"
                }`}
              ></div>
            </div>

            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 3
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
              <div className="mt-2 text-sm font-medium">Paiement</div>
            </div>
          </div>
        </div>

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
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        placeholder="Votre prénom"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        aria-required="true"
                        aria-invalid={!!formErrors.firstName}
                        aria-describedby={formErrors.firstName ? "firstName-error" : undefined}
                        className={formErrors.firstName ? "border-destructive" : ""}
                      />
                      {formErrors.firstName && (
                        <p id="firstName-error" className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        placeholder="Votre nom"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        aria-required="true"
                        aria-invalid={!!formErrors.lastName}
                        aria-describedby={formErrors.lastName ? "lastName-error" : undefined}
                        className={formErrors.lastName ? "border-destructive" : ""}
                      />
                      {formErrors.lastName && (
                        <p id="lastName-error" className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@exemple.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.email}
                      aria-describedby={formErrors.email ? "email-error" : undefined}
                      className={formErrors.email ? "border-destructive" : ""}
                    />
                    {formErrors.email && (
                      <p id="email-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone (optionnel)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Votre numéro de téléphone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      aria-invalid={!!formErrors.phone}
                      aria-describedby={formErrors.phone ? "phone-error" : "phone-description"}
                      className={formErrors.phone ? "border-destructive" : ""}
                    />
                    {formErrors.phone ? (
                      <p id="phone-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.phone}
                      </p>
                    ) : (
                      <p id="phone-description" className="text-sm text-muted-foreground">
                        Pour vous contacter en cas de problème avec votre commande
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={goToNextStep}
                    aria-describedby="step1-instructions"
                  >
                    Continuer vers la livraison
                  </Button>
                  <p id="step1-instructions" className="sr-only">
                    Passer à l'étape suivante pour saisir votre adresse de livraison
                  </p>
                </fieldset>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center mb-6">
                    <button
                      className="text-primary hover:text-primary/80 flex items-center"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                    </button>
                    <h2 className="text-xl font-medium ml-4">
                      Adresse de Livraison
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse *</Label>
                    <Input
                      id="address"
                      placeholder="Numéro et nom de rue"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.address}
                      aria-describedby={formErrors.address ? "address-error" : undefined}
                      className={formErrors.address ? "border-destructive" : ""}
                    />
                    {formErrors.address && (
                      <p id="address-error" className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.address}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressComplement">
                      Complément d'adresse (optionnel)
                    </Label>
                    <Input
                      id="addressComplement"
                      placeholder="Appartement, étage, etc."
                      value={formData.addressComplement}
                      onChange={handleInputChange}
                      aria-invalid={!!formErrors.addressComplement}
                      className={formErrors.addressComplement ? "border-destructive" : ""}
                    />
                    {formErrors.addressComplement && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.addressComplement}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal *</Label>
                      <Input
                        id="postalCode"
                        placeholder="Code postal"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        aria-required="true"
                        aria-invalid={!!formErrors.postalCode}
                        aria-describedby={formErrors.postalCode ? "postalCode-error" : undefined}
                        className={formErrors.postalCode ? "border-destructive" : ""}
                      />
                      {formErrors.postalCode && (
                        <p id="postalCode-error" className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.postalCode}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Ville *</Label>
                      <Input
                        id="city"
                        placeholder="Ville"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        aria-required="true"
                        aria-invalid={!!formErrors.city}
                        aria-describedby={formErrors.city ? "city-error" : undefined}
                        className={formErrors.city ? "border-destructive" : ""}
                      />
                      {formErrors.city && (
                        <p id="city-error" className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.city}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      className={`w-full h-10 px-3 py-2 border bg-background text-foreground rounded-md focus:outline-none focus:border-primary ${
                        formErrors.country ? "border-destructive" : "border-border"
                      }`}
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="MC">Monaco</option>
                      <option value="LU">Luxembourg</option>
                    </select>
                    {formErrors.country && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.country}
                      </p>
                    )}
                  </div>

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={goToNextStep}
                  >
                    Continuer vers le paiement
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center mb-6">
                    <button
                      className="text-primary hover:text-primary/80 flex items-center"
                      onClick={() => setStep(2)}
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
                      className={`border rounded-lg p-4 ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start">
                        <RadioGroupItem
                          value="card"
                          id="card"
                          className="mt-1"
                        />
                        <div className="ml-2">
                          <Label
                            htmlFor="card"
                            className="text-lg flex items-center"
                          >
                            <CreditCard className="mr-2 h-5 w-5" /> Carte de
                            crédit
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Visa, Mastercard, American Express
                          </p>

                          {paymentMethod === "card" && (
                            <div className="mt-4 space-y-4 animate-fade-in">
                              <div className="space-y-2">
                                <Label htmlFor="cardNumber">
                                  Numéro de carte
                                </Label>
                                <Input
                                  id="cardNumber"
                                  placeholder="1234 5678 9012 3456"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="expiry">
                                    Date d'expiration
                                  </Label>
                                  <Input id="expiry" placeholder="MM/AA" />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="cvc">CVC</Label>
                                  <Input id="cvc" placeholder="123" />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="nameOnCard">
                                  Nom sur la carte
                                </Label>
                                <Input
                                  id="nameOnCard"
                                  placeholder="Nom complet"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 ${
                        paymentMethod === "paypal"
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="ml-2 text-lg">
                          PayPal
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>

                  <Button
                    className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Traitement en cours..."
                      : `Payer ${total.toFixed(2)} €`}
                  </Button>
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
