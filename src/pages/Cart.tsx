// File_name : src/pages/Cart.tsx
// this file contains the Cart component that displays the user's cart and allows them to manage their items.

import { ArrowRight, ShoppingBag, X, Plus, Minus } from "lucide-react";
import {
  // getCart, // No longer needed from mockApiService
  removeFromCart,
  updateCartItemQuantity,
} from "@/api/mockApiService";
import { useEffect } from "react"; // Removed useState

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useCart } from "@/context/useCart";
import { ProductImage } from "@/components/ui/GlobalImage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Cart = () => {
  // const [cartItems, setCartItems] = useState([]); // Removed: Get items from context
  // const [loading, setLoading] = useState(true); // Removed: CartContext handles initial load
  const { cart, dispatch } = useCart();
  const cartItems = cart.items; // Get items directly from context

  useEffect(() => {
    window.scrollTo(0, 0);
    // fetchCart(); // Removed: Cart is hydrated by CartProvider
  }, []);

  // const fetchCart = async () => { // Removed
  //   try {
  //     const cart = await getCart(); // mockApiService.getCart() is no longer for fetching items
  //     // setCartItems(cart.items || []); // Data comes from context
  //     // setLoading(false);
  //   } catch (error) {
  //     console.error("Error fetching cart:", error);
  //     toast.error("Erreur lors du chargement du panier");
  //     // setLoading(false);
  //   }
  // };

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    try {
      // Simulate API call first
      const response = await updateCartItemQuantity(itemId, newQuantity);
      if (response.success) {
        // Then dispatch action to update context state
        dispatch({ type: "UPDATE_ITEM_QUANTITY", payload: { id: itemId, quantity: newQuantity } });
        if (newQuantity > 0) {
          toast.success("Quantité mise à jour");
        } else {
          toast.success("Produit retiré du panier"); // As quantity <= 0 removes it
        }
      } else {
        toast.error("Erreur lors de la mise à jour de la quantité");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Erreur lors de la mise à jour de la quantité");
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      // Simulate API call first
      const response = await removeFromCart(itemId);
      if (response.success) {
        // Then dispatch action to update context state
        dispatch({ type: "REMOVE_ITEM", payload: itemId });
        toast.success("Produit retiré du panier");
      } else {
        toast.error("Erreur lors de la suppression du produit");
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Erreur lors de la suppression du produit");
    }
  };

  // Calculate totals using data from context
  const subtotal = cart.totalPrice; // Use totalPrice from context
  const shipping = subtotal > 0 ? 6.95 : 0; // Shipping logic can remain local
  const total = subtotal + shipping;

  // Loading state is implicitly handled by CartProvider's initial hydration.
  // A more sophisticated app might have a global loading indicator or specific loading states for API interactions.
  // For this refactor, we assume CartProvider handles initial load and then context is source of truth.

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
                        <Link
                          to={`/products/${item.product.id}`}
                           className="flex items-center hover:bg-stone-50 rounded-md p-2 transition"
                         >
                           <div className="w-20 h-20 rounded-md overflow-hidden mr-4">
                             <ProductImage
                               src={item.product.images[0]}
                               alt={item.product.name}
                               className="w-full h-full object-cover rounded-md"
                               showRetryButton={true}
                             />
                           </div>
                           <h3 className="font-medium text-stone-800">
                             {item.product.name}
                          </h3>
                        </Link>

                        {/* Remove Button (outside the Link!) */}
                        <button
                          className="ml-4 mt-1 text-stone-400 hover:text-stone-600 text-sm flex items-center"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-3 w-3 mr-1" /> Retirer
                        </button>
                      </div>

                      {/* Price */}
                      <div className="md:col-span-2 md:text-center">
                        <div className="md:hidden text-sm text-stone-500">
                          Prix:
                        </div>
                        <div>{item.product.price} €</div>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2 md:text-center">
                        <div className="md:hidden text-sm text-stone-500">
                          Quantité:
                        </div>
                        <div className="flex md:justify-center">
                          <button
                            className="border border-stone-300 rounded-l-md px-3 py-2 hover:bg-stone-50"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity - 1)
                            }
                          >
                            -
                          </button>
                          <input
                            type="text"
                            value={item.quantity}
                            readOnly
                            className="border-t border-b border-stone-300 px-4 py-2 w-16 text-center focus:outline-none"
                          />
                          <button
                            className="border border-stone-300 rounded-r-md px-3 py-2 hover:bg-stone-50"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity + 1)
                            }
                          >
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
                          {item.product.price * item.quantity} €
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
