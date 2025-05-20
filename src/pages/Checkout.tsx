import { ArrowLeft, CheckCircle, CreditCard } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Separator } from "@/components/ui/separator";

// Mock cart data
const cartItems = [
  {
    id: 1,
    name: "Sac à Main Tissé Traditionnel",
    price: 89,
    quantity: 1,
    image: "/public/assets/images/sacs/sac_traditionnel.jpg",
  },
  {
    id: 3,
    name: "Pochette Brodée à la Main",
    price: 62,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80",
  },
];

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("card");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = 6.95;
  const total = subtotal + shipping;

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
                      <Input id="firstName" placeholder="Votre prénom" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input id="lastName" placeholder="Votre nom" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@exemple.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" placeholder="Votre numéro de téléphone" />
                  </div>

                  <Button
                    className="w-full md:w-auto bg-olive-700 hover:bg-olive-800"
                    onClick={() => setStep(2)}
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
                    <Input id="address" placeholder="Numéro et nom de rue" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressComplement">
                      Complément d'adresse (optionnel)
                    </Label>
                    <Input
                      id="addressComplement"
                      placeholder="Appartement, étage, etc."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal</Label>
                      <Input id="postalCode" placeholder="Code postal" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" placeholder="Ville" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <select
                      id="country"
                      className="w-full h-10 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:border-olive-400"
                      defaultValue="FR"
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
                    onClick={() => setStep(3)}
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

                  <Button className="w-full md:w-auto bg-olive-700 hover:bg-olive-800">
                    Payer {total.toFixed(2)} €
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
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-stone-800">
                          {item.name}
                        </h4>
                        <div className="text-xs text-stone-500 mt-1">
                          Quantité: {item.quantity}
                        </div>
                      </div>
                      <div className="text-olive-700 font-medium">
                        {item.price} €
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
