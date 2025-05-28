import { ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Stripe, loadStripe } from "@stripe/stripe-js";
import { getCart } from "@/api/mockApiService";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Initialize Stripe
const stripePromise: Promise<Stripe | null> = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);
//   betas: ['YOUR_BETA_FEATURES']
// });

// In your Stripe initialization code
// const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY, {
//   locale: 'fr',
//   betas: ['YOUR_BETA_FEATURES']
// });

const Checkout: () => void = () => {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
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
    cardNumber: "",
    expiry: "",
    cvc: "",
    nameOnCard: ""
  });

  const [formErrors, setFormErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    nameOnCard: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  // Form validation functions
  const validateForm = (step: number): boolean => {
    const errors: typeof formErrors = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      postalCode: '',
      city: '',
      cardNumber: '',
      expiry: '',
      cvc: '',
      nameOnCard: ''
    };

    if (step === 1) {
      if (!formData.firstName) {
        errors.firstName = 'Le prénom est requis';
      }
      if (!formData.lastName) {
        errors.lastName = 'Le nom est requis';
      }
      if (!formData.email) {
        errors.email = 'L\'email est requis';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Veuillez entrer une adresse email valide';
      }
    }

    if (step === 2) {
      if (!formData.address) {
        errors.address = 'L\'adresse est requise';
      }
      if (!formData.postalCode) {
        errors.postalCode = 'Le code postal est requis';
      } else if (formData.country === 'FR' && !/^\d{5}$/.test(formData.postalCode)) {
        errors.postalCode = 'Veuillez entrer un code postal français valide (5 chiffres)';
      }
      if (!formData.city) {
        errors.city = 'La ville est requise';
      }
    }

    if (step === 3 && paymentMethod === 'card') {
      if (!formData.cardNumber) {
        errors.cardNumber = 'Le numéro de carte est requis';
      } else if (!/\d{4} \d{4} \d{4} \d{4}/.test(formData.cardNumber)) {
        errors.cardNumber = 'Veuillez entrer un numéro de carte valide';
      }
      if (!formData.expiry) {
        errors.expiry = 'La date d\'expiration est requise';
      } else if (!/\d{2}\/\d{2}/.test(formData.expiry)) {
        errors.expiry = 'Format invalide (MM/AA)';
      }
      if (!formData.cvc) {
        errors.cvc = 'Le CVC est requis';
      } else if (!/\d{3}/.test(formData.cvc)) {
        errors.cvc = 'Le CVC doit contenir 3 chiffres';
      }
      if (!formData.nameOnCard) {
        errors.nameOnCard = 'Le nom sur la carte est requis';
      }
    }

    setFormErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    void fetchCart();
  }, [step]);

  const fetchCart = async () => {
    try {
      const cart = await getCart();
      setCartItems(cart.items || []);
      setCartTotal(cart.total || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching cart:", error);
      toast.error("Erreur lors du chargement du panier");
      setLoading(false);
    }
  };

  // Handle input changes for both input and select elements
  const handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  // Navigate to next step if form is valid
  const goToNextStep: () => void = () => {
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

      // Here you would typically send the order data to your backend
      // which would create a Stripe checkout session

      // For demo purposes, we'll simulate a successful payment
      setTimeout(() => {
        toast.success("Paiement traité avec succès");
        // Here you would typically redirect to a success page
        // and clear the cart
        setIsProcessing(false);
      }, 1500);

      // In a real implementation, you would have code like this:
      /*
      const stripe = await stripePromise;
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cartItems,
          customerInfo: formData
        }),
      });
      
      const { sessionId } = await response.json();
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        console.error('Error redirecting to checkout:', error);
        toast.error("Erreur lors de la redirection vers le paiement");
        setIsProcessing(false);
      }
      */
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors du paiement");
      setIsProcessing(false);
    }
  };

  // Calculate totals
  const subtotal = cartTotal;
  const shipping = subtotal > 0 ? 6.95 : 0;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-8 text-center">
            Paiement
          </h1>
          <div className="text-center">
            <p>Chargement de votre commande...</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-8 text-center">
          Paiement
        </h1>

        {/* Checkout Steps */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex justify-between">
            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-olive-700 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                1
              </div>
              <div className="mt-2 text-sm font-medium">Information</div>
            </div>

            <div className="w-full max-w-[100px] flex items-center">
              <div
                className={`h-1 w-full ${
                  step >= 2 ? "bg-olive-700" : "bg-stone-200"
                }`}
              ></div>
            </div>

            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-olive-700 text-white"
                    : "bg-stone-200 text-stone-500"
                }`}
              >
                2
              </div>
              <div className="mt-2 text-sm font-medium">Livraison</div>
            </div>

            <div className="w-full max-w-[100px] flex items-center">
              <div
                className={`h-1 w-full ${
                  step >= 3 ? "bg-olive-700" : "bg-stone-200"
                }`}
              ></div>
            </div>

            <div className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= 3
                    ? "bg-olive-700 text-white"
                    : "bg-stone-200 text-stone-500"
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
                <div className="space-y-6 animate-fade-in">
                  <h2 className="text-xl font-medium mb-4">Vos Coordonnées</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Votre prénom"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        autoComplete="given-name"
                        aria-label="Votre prénom"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Votre nom"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        autoComplete="family-name"
                        aria-label="Votre nom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="votre.email@exemple.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      autoComplete="email"
                      aria-label="Votre adresse email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Votre numéro de téléphone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      autoComplete="tel"
                      aria-label="Votre numéro de téléphone"
                    />
                  </div>

                  <Button
                    className="w-full md:w-auto bg-olive-700 hover:bg-olive-800"
                    onClick={goToNextStep}
                  >
                    Continuer vers la livraison
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center mb-6">
                    <button
                      className="text-olive-700 hover:text-olive-900 flex items-center"
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
                      name="address"
                      type="text"
                      placeholder="Numéro et nom de rue"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      autoComplete="street-address"
                      aria-label="Votre adresse"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressComplement">
                      Complément d'adresse (optionnel)
                    </Label>
                    <Input
                      id="addressComplement"
                      name="addressComplement"
                      type="text"
                      placeholder="Appartement, étage, etc."
                      value={formData.addressComplement}
                      onChange={handleInputChange}
                      autoComplete="address-line2"
                      aria-label="Complément d'adresse"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal</Label>
                      <Input
                        id="postalCode"
                        name="postalCode"
                        type="text"
                        placeholder="Code postal"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        required
                        autoComplete="postal-code"
                        aria-label="Code postal"
                        pattern="[0-9]{5}"
                        title="Veuillez entrer un code postal valide (5 chiffres)"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        name="city"
                        type="text"
                        placeholder="Ville"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        autoComplete="address-level2"
                        aria-label="Ville"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      name="country"
                      className="w-full h-10 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-olive-400"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      aria-label="Pays"
                    >
                      <option value="FR">France</option>
                      <option value="BE">Belgique</option>
                      <option value="CH">Suisse</option>
                      <option value="MC">Monaco</option>
                      <option value="LU">Luxembourg</option>
                    </select>
                  </div>

                  <Button
                    className="w-full md:w-auto bg-olive-700 hover:bg-olive-800"
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
                      className="text-olive-700 hover:text-olive-900 flex items-center"
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
                          ? "border-olive-500 bg-olive-50"
                          : "border-stone-200"
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
                          <p className="text-sm text-stone-500 mt-1">
                            Visa, Mastercard, American Express
                          </p>

                          {paymentMethod === "card" && (
                            <div className="mt-4 space-y-4 animate-fade-in">
                              <div className="space-y-2">
                                <Label htmlFor="cardNumber">
                                  Numéro de carte
                                </Label>
                                <div className="space-y-2">
                                  <Input
                                    id="cardNumber"
                                    name="cardNumber"
                                    type="text"
                                    placeholder="Numéro de carte"
                                    pattern="\d{4} \d{4} \d{4} \d{4}"
                                    title="Veuillez entrer un numéro de carte valide (format: 1234 5678 9012 3456)"
                                    required
                                    aria-label="Numéro de carte"
                                    autoComplete="cc-number"
                                    onChange={handleInputChange}
                                    className={formErrors.cardNumber ? 'border-red-500' : ''}
                                  />
                                  {formErrors.cardNumber && (
                                    <p className="text-sm text-red-500">{formErrors.cardNumber}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="expiry">
                                    Date d'expiration
                                  </Label>
                                  <div className="space-y-2">
                                  <Input
                                    id="expiry"
                                    name="expiry"
                                    type="text"
                                    placeholder="Date d'expiration"
                                    pattern="\d{2}/\d{2}"
                                    title="Format: MM/AA"
                                    required
                                    aria-label="Date d'expiration"
                                    autoComplete="cc-exp"
                                    onChange={handleInputChange}
                                    className={formErrors.expiry ? 'border-red-500' : ''}
                                  />
                                  {formErrors.expiry && (
                                    <p className="text-sm text-red-500">{formErrors.expiry}</p>
                                  )}
                                </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="cvc">CVC</Label>
                                  <div className="space-y-2">
                                  <Input
                                    id="cvc"
                                    name="cvc"
                                    type="text"
                                    placeholder="CVC"
                                    pattern="\d{3}"
                                    maxLength={3}
                                    required
                                    aria-label="CVC"
                                    autoComplete="cc-csc"
                                    onChange={handleInputChange}
                                    className={formErrors.cvc ? 'border-red-500' : ''}
                                  />
                                  {formErrors.cvc && (
                                    <p className="text-sm text-red-500">{formErrors.cvc}</p>
                                  )}
                                </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="nameOnCard">
                                  Nom sur la carte
                                </Label>
                                <div className="space-y-2">
                                  <Input
                                    id="nameOnCard"
                                    name="nameOnCard"
                                    type="text"
                                    placeholder="Nom sur la carte"
                                    required
                                    aria-label="Nom sur la carte"
                                    autoComplete="cc-name"
                                    onChange={handleInputChange}
                                    className={formErrors.nameOnCard ? 'border-red-500' : ''}
                                  />
                                  {formErrors.nameOnCard && (
                                    <p className="text-sm text-red-500">{formErrors.nameOnCard}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 ${
                        paymentMethod === "paypal"
                          ? "border-olive-500 bg-olive-50"
                          : "border-stone-200"
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
                    className="w-full md:w-auto bg-olive-700 hover:bg-olive-800"
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
              <div className="border rounded-lg p-6 bg-stone-50 sticky top-8">
                <h3 className="font-serif text-xl text-stone-800 mb-4">
                  Récapitulatif de la commande
                </h3>

                {/* Order Items */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center">
                      <div className="w-16 h-16 rounded-md overflow-hidden mr-4 bg-white border">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-stone-800">
                          {item.product.name}
                        </h4>
                        <div className="text-xs text-stone-500 mt-1">
                          Quantité: {item.quantity}
                        </div>
                      </div>
                      <div className="text-olive-700 font-medium">
                        {item.product.price} €
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Order Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Sous-total</span>
                    <span className="font-medium">{subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Frais de livraison</span>
                    <span className="font-medium">{shipping.toFixed(2)} €</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-medium">Total</span>
                    <span className="font-medium text-olive-700">
                      {total.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="bg-white p-3 rounded-md border mt-6">
                  <div className="flex items-center justify-center space-x-2 text-sm text-stone-600">
                    <CheckCircle className="h-4 w-4 text-olive-700" />
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
