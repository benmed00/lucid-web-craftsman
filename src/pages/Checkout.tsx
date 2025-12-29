import { ArrowLeft, CheckCircle, CreditCard, Tag, Loader2, X, Truck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stripe } from "@stripe/stripe-js"; // Type import only
import { useEffect, useState } from "react";

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
  
  const [formData, setFormData] = useState({
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
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Handle input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Validate and apply promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("Veuillez entrer un code promo");
      return;
    }

    setIsValidatingPromo(true);
    setPromoError("");

    try {
      const { data, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
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

  // Navigate to next step if form is valid
  const goToNextStep = () => {
    if (step === 1) {
      // Validate customer information form
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      // Simple email validation
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        toast.error("Veuillez entrer une adresse email valide");
        return;
      }
    } else if (step === 2) {
      // Validate shipping information
      if (!formData.address || !formData.postalCode || !formData.city) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      // Validate postal code format for France
      if (formData.country === "FR" && !/^\d{5}$/.test(formData.postalCode)) {
        toast.error(
          "Veuillez entrer un code postal français valide (5 chiffres)"
        );
        return;
      }
    }
    // Proceed to next step
    setStep(step + 1);
  };

  // Process payment
  const handlePayment = async () => {
    try {
      setIsProcessing(true);

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

      // Call Supabase edge function to create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          items: cartItems,
          customerInfo: formData,
          discount: appliedCoupon ? {
            couponId: appliedCoupon.id,
            code: appliedCoupon.code,
            amount: discount
          } : null
        }
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
                        aria-describedby="firstName-error"
                      />
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
                        aria-describedby="lastName-error"
                      />
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
                      aria-describedby="email-error"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone (optionnel)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Votre numéro de téléphone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      aria-describedby="phone-description"
                    />
                    <p id="phone-description" className="text-sm text-muted-foreground">
                      Pour vous contacter en cas de problème avec votre commande
                    </p>
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
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      placeholder="Numéro et nom de rue"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
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
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal</Label>
                      <Input
                        id="postalCode"
                        placeholder="Code postal"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        placeholder="Ville"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      className="w-full h-10 px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:border-primary"
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="MC">Monaco</option>
                      <option value="LU">Luxembourg</option>
                    </select>
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
                            validatePromoCode();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={validatePromoCode}
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
