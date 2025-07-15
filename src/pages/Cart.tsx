// File_name : src/pages/Cart.tsx
// this file contains the Cart component that displays the user's cart and allows them to manage their items.

import { ArrowRight, ShoppingBag, X } from "lucide-react";
import {
  getCart,
  removeFromCart,
  updateCartItemQuantity,
} from "@/api/mockApiService";
// useEffect and useState removed for cartItems/loading
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // Added

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
// useCart import might be removed if dispatch is no longer used, or kept if other parts of context are used.
// For now, we'll assume dispatch is removed due to react-query handling state.
// import { useCart } from "@/context/useCart";
import CartItemRow from '@/components/cart/CartItemRow'; // Added
import CartSummary from '@/components/cart/CartSummary'; // Added
import { CartItem } from '@/components/cart/CartItemRow'; // Import CartItem type

const Cart = () => {
  const queryClient = useQueryClient();

  // Fetch cart data using React Query
  const {
    data: cart,
    isLoading,
    isError,
    error
  } = useQuery<{ items: CartItem[] }, Error>({ // Specify type for cart data
    queryKey: ['cart'],
    queryFn: getCart,
  });

  // Scroll to top on mount - using useState for this effect
  useState(() => {
    window.scrollTo(0, 0);
    return undefined;
  });

  const updateQuantityMutation = useMutation({
    mutationFn: (variables: { productId: number; quantity: number }) =>
      updateCartItemQuantity(variables.productId, variables.quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: Error) => {
      console.error("Error updating quantity:", err);
      toast.error("Erreur lors de la mise à jour de la quantité");
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: number) => removeFromCart(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success("Produit retiré du panier");
    },
    onError: (err: Error) => {
      console.error("Error removing item:", err);
      toast.error("Erreur lors de la suppression du produit");
    },
  });

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    // Basic validation, can be enhanced in CartItemRow or here
    if (newQuantity >= 1) {
      updateQuantityMutation.mutate({ productId, quantity: newQuantity });
    } else if (newQuantity === 0) {
      // Optional: if quantity is set to 0, remove the item
      // removeItemMutation.mutate(productId);
      // For now, QuantitySelector in CartItemRow prevents going below 1.
    }
  };

  const handleRemoveItem = (productId: number) => {
    removeItemMutation.mutate(productId);
  };

  const cartItems: CartItem[] = cart?.items || [];

  // Calculate totals
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = subtotal > 0 ? 6.95 : 0; // Keep this logic
  const total = subtotal + shipping;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-8 text-center">
            Votre Panier
          </h1>
          <div className="text-center">
            <p>Chargement de votre panier...</p>
            {/* You can add a spinner here */}
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-stone-800 mb-8 text-center">
            Votre Panier
          </h1>
          <div className="text-center text-red-500">
            <p>Erreur lors du chargement du panier: {error?.message}</p>
            <Button onClick={() => queryClient.refetchQueries({ queryKey: ['cart'] })} className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  // cart is defined by now if not loading or erroring
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
            {/* Cart Items Section */}
            <div className="lg:col-span-2">
              <div className="border rounded-lg overflow-hidden">
                {/* Cart Header */}
                <div className="bg-stone-50 px-6 py-4 hidden md:grid grid-cols-12 text-stone-600 font-medium">
                  <div className="col-span-6">Produit</div>
                  <div className="col-span-2 text-center">Prix</div>
                  <div className="col-span-2 text-center">Quantité</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Cart Items - Rendered using CartItemRow */}
                {cartItems.map((item, index) => (
                  <React.Fragment key={item.id}> {/* Use React.Fragment for key if Separator is conditional */}
                    {index > 0 && <Separator />}
                    <CartItemRow
                      item={item}
                      onQuantityChange={handleQuantityChange}
                      onRemoveItem={handleRemoveItem}
                      isUpdating={updateQuantityMutation.isPending || removeItemMutation.isPending} // Example of passing loading state
                    />
                  </React.Fragment>
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

            {/* Cart Summary - Replaced with CartSummary component */}
            <CartSummary subtotal={subtotal} shipping={shipping} total={total} />
          </div>
        )}
      </div>

      <PageFooter />
    </div>
  );
};

export default Cart;
