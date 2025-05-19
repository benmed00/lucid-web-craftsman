import { ArrowRight, ShoppingBag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

// Mock cart data
const cartItems = [
  {
    id: 1,
    name: "Sac à Main Tissé Traditionnel",
    price: 89,
    quantity: 1,
    image: "public/assets/images/products/sac_a_main_tisse_traditionnel.jpg",
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

const Cart = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          Votre Panier
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex justify-center mb-4">
              <ShoppingBag className="h-16 w-16 text-stone-300" />
            </div>
            <h2 className="text-2xl font-serif text-stone-800 mb-4">
              Votre panier est vide
            </h2>
            <p className="text-stone-600 mb-8">
              Vous n'avez aucun article dans votre panier.
            </p>
            <Link to="/products">
              <Button className="bg-olive-700 hover:bg-olive-800">
                Découvrir nos produits
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="border rounded-lg overflow-hidden">
                {/* Cart Header */}
                <div className="bg-stone-50 px-6 py-4 hidden md:grid grid-cols-12 text-stone-600 font-medium">
                  <div className="col-span-6">Produit</div>
                  <div className="col-span-2 text-center">Prix</div>
                  <div className="col-span-2 text-center">Quantité</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Cart Items */}
                {cartItems.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator />}
                    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      {/* Product Info */}
                      <div className="md:col-span-6 flex items-center">
                        <div className="w-20 h-20 rounded-md overflow-hidden mr-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-800">
                            {item.name}
                          </h3>
                          <button className="mt-1 text-stone-400 hover:text-stone-600 text-sm flex items-center">
                            <X className="h-3 w-3 mr-1" /> Retirer
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2 md:text-center">
                        <div className="md:hidden text-sm text-stone-500">
                          Prix:
                        </div>
                        <div>{item.price} €</div>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2 md:text-center">
                        <div className="md:hidden text-sm text-stone-500">
                          Quantité:
                        </div>
                        <div className="flex md:justify-center">
                          <button className="border border-stone-300 rounded-l-md px-2 py-1 hover:bg-stone-50">
                            -
                          </button>
                          <input
                            type="text"
                            value={item.quantity}
                            readOnly
                            className="border-t border-b border-stone-300 px-2 py-1 w-8 text-center focus:outline-none"
                          />
                          <button className="border border-stone-300 rounded-r-md px-2 py-1 hover:bg-stone-50">
                            +
                          </button>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="md:col-span-2 md:text-right">
                        <div className="md:hidden text-sm text-stone-500">
                          Total:
                        </div>
                        <div className="font-medium">
                          {item.price * item.quantity} €
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Shopping */}
              <div className="mt-8">
                <Link
                  to="/products"
                  className="inline-flex items-center text-olive-700 hover:text-olive-900"
                >
                  <ArrowRight className="mr-2 h-4 w-4 rotate-180" /> Continuer
                  vos achats
                </Link>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="border rounded-lg p-6 bg-stone-50">
                <h3 className="font-serif text-xl text-stone-800 mb-4">
                  Récapitulatif
                </h3>

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

                <Link to="/checkout">
                  <Button className="w-full bg-olive-700 hover:bg-olive-800 text-white">
                    Passer à la caisse
                  </Button>
                </Link>

                <div className="mt-6 text-center text-sm text-stone-500">
                  Moyens de paiement sécurisés : Carte Bancaire, PayPal
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
};

export default Cart;
