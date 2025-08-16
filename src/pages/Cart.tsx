import React, { useState, useMemo } from 'react';
import { useCart } from '@/context/useCart';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShipping } from '@/hooks/useShipping';
import { useStock } from '@/hooks/useStock';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { removeFromCart as removeFromCartAPI, updateCartItemQuantity } from '@/api/mockApiService';
import FloatingCartButton from '@/components/ui/FloatingCartButton';

const Cart = () => {
  const { cart, dispatch, itemCount, totalPrice } = useCart();
  const [postalCode, setPostalCode] = useState('');
  const { calculation, loading: shippingLoading, loadZones } = useShipping({ postalCode, orderAmount: totalPrice });
  
  // Get all product IDs from cart for bulk stock checking
  const productIds = cart.items.map(item => item.product.id);
  const { stockInfo, canOrderQuantity } = useStock({ productIds, enabled: productIds.length > 0 });

  // Check stock for all items and get any issues
  const stockIssues = useMemo(() => {
    const issues: { productId: number; available: number; requested: number }[] = [];
    
    if (stockInfo && typeof stockInfo === 'object') {
      cart.items.forEach(item => {
        const productStock = stockInfo[item.product.id];
        if (productStock && productStock.isOutOfStock) {
          issues.push({
            productId: item.product.id,
            available: productStock.available,
            requested: item.quantity
          });
        }
      });
    }
    
    return issues;
  }, [cart.items, stockInfo]);

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }
    
    try {
      const response = await updateCartItemQuantity(itemId, newQuantity);
      if (response.success) {
        dispatch({ type: "UPDATE_ITEM_QUANTITY", payload: { id: itemId, quantity: newQuantity } });
        toast.success("Quantité mise à jour");
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
      const response = await removeFromCartAPI(itemId);
      if (response.success) {
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

  const handleCheckShipping = () => {
    if (!postalCode.trim()) {
      toast.error('Veuillez entrer un code postal');
      return;
    }
    loadZones();
  };

  const subtotal = totalPrice;
  const shippingCost = calculation?.cost || 0;
  const total = subtotal + shippingCost;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-stone-400" />
            </div>
            <h1 className="text-2xl font-serif text-stone-800 mb-4">Votre Panier est Vide</h1>
            <p className="text-stone-600 mb-8">Découvrez notre belle collection de produits artisanaux</p>
            <Link to="/products">
              <Button className="bg-olive-700 hover:bg-olive-800 text-white px-8 py-3">
                Commencer Vos Achats
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main className="container mx-auto px-4 py-4 md:py-8 safe-area">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-serif text-stone-800 mb-2">Votre Panier</h1>
          <p className="text-stone-600">{itemCount} article{itemCount > 1 ? 's' : ''} dans votre panier</p>
        </div>

        {stockIssues.length > 0 && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Attention : Certains articles de votre panier ont un stock limité. Veuillez ajuster les quantités.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            {cart.items.map((item) => {
              const productStock = stockInfo && typeof stockInfo === 'object' ? stockInfo[item.product.id] : null;
              const hasStockIssue = stockIssues.find(issue => issue.productId === item.product.id);
              
              return (
                <Card key={item.id} className={`transition-all duration-200 ${hasStockIssue ? 'border-amber-200 bg-amber-50' : ''}`}>
                  <CardContent className="p-4 md:p-6">
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.product.images[0] || '/placeholder.svg'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 mr-2">
                            <h3 className="font-medium text-stone-800 text-sm md:text-base leading-tight">{item.product.name}</h3>
                            <p className="text-xs md:text-sm text-stone-600">{item.product.category}</p>
                            {hasStockIssue && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-100 mt-1">
                                Stock limité ({productStock?.available} disponibles)
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-stone-400 hover:text-red-500 p-2 touch-manipulation min-h-[44px] min-w-[44px] flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            >
                              <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <span className="w-8 md:w-10 text-center font-medium text-base">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={productStock && item.quantity >= productStock.available}
                              className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            >
                              <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto">
                            <p className="font-medium text-stone-800 text-base md:text-lg">{(item.product.price * item.quantity).toFixed(2)} €</p>
                            <p className="text-xs md:text-sm text-stone-600">{item.product.price.toFixed(2)} € l'unité</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="lg:sticky lg:top-4">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl font-medium text-stone-800 mb-4">Résumé de Commande</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} €</span>
                  </div>
                  
                  {calculation && (
                    <>
                      <div className="flex justify-between">
                        <span>Livraison</span>
                        <span>{calculation.is_free ? 'Gratuit' : `${calculation.cost.toFixed(2)} €`}</span>
                      </div>
                      <div className="flex justify-between text-sm text-stone-600">
                        <span>Délai de livraison</span>
                        <span>{calculation.delivery_estimate}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total</span>
                      <span>{total.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Calculator */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <Truck className="inline h-4 w-4 mr-1" />
                    Calculer les frais de livraison
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Code postal"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCheckShipping}
                      disabled={shippingLoading}
                    >
                      {shippingLoading ? 'Calcul...' : 'Calculer'}
                    </Button>
                  </div>
                </div>

                <Link to="/checkout">
                  <Button 
                    className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3 md:py-4 text-base md:text-lg font-medium touch-manipulation min-h-[48px] md:min-h-[56px]"
                    disabled={stockIssues.length > 0}
                  >
                    {stockIssues.length > 0 ? 'Corriger le stock d\'abord' : 'Procéder au Paiement'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <div className="mt-4 text-center">
                  <Link to="/products" className="text-olive-700 hover:text-olive-900 text-sm">
                    Continuer mes achats
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
