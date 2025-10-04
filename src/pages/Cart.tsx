import React, { useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck, AlertCircle, CreditCard, Heart, Share2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShipping } from '@/hooks/useShipping';
import { useStock } from '@/hooks/useStock';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { removeFromCart as removeFromCartAPI, updateCartItemQuantity } from '@/api/mockApiService';
import FloatingCartButton from '@/components/ui/FloatingCartButton';
import { MobilePaymentButtons } from '@/components/ui/MobilePaymentButtons';
import { LocationBasedFeatures } from '@/components/ui/LocationBasedFeatures';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useIsMobile } from '@/hooks/use-mobile';

const Cart = () => {
  const { cart, dispatch, itemCount, totalPrice } = useCart();
  const [postalCode, setPostalCode] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { calculation, loading: shippingLoading, loadZones } = useShipping({ postalCode, orderAmount: totalPrice });
  const isMobile = useIsMobile();
  
  // Get all product IDs from cart for bulk stock checking
  const productIds = cart.items.map(item => item.product.id);
  const { stockInfo, canOrderQuantity } = useStock({ productIds, enabled: productIds.length > 0 });

  const handlePaymentSuccess = (paymentMethod: string) => {
    toast.success(`Paiement réussi via ${paymentMethod}`);
    // Clear cart and redirect
    dispatch({ type: "CLEAR_CART" });
    setTimeout(() => {
      window.location.href = "/payment-success";
    }, 1500);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
    setIsCheckingOut(false);
  };

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
        <main id="main-content" className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div 
              className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6"
              aria-hidden="true"
            >
              <ShoppingBag className="h-12 w-12 text-stone-400" />
            </div>
            <h1 className="text-2xl font-serif text-stone-800 mb-4">Votre Panier est Vide</h1>
            <p className="text-stone-600 mb-8">Découvrez notre belle collection de produits artisanaux</p>
            <Link to="/products">
              <Button 
                className="bg-olive-700 hover:bg-olive-800 text-white px-8 py-3"
                id="empty-cart-shop-button"
                name="start-shopping-button"
                aria-label="Commencer vos achats - Aller à la page produits"
              >
                Commencer Vos Achats
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
      
      <main id="main-content" className="container mx-auto px-4 py-4 md:py-8 safe-area">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-serif text-stone-800 mb-2">Votre Panier</h1>
          <p className="text-stone-600" aria-live="polite">
            {itemCount} article{itemCount > 1 ? 's' : ''} dans votre panier
          </p>
        </div>

        {stockIssues.length > 0 && (
          <Alert 
            className="mb-6 border-amber-200 bg-amber-50"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
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
                <Card 
                  key={item.id} 
                  className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${hasStockIssue ? 'border-amber-200 bg-amber-50' : ''}`}
                  role="article"
                  aria-labelledby={`cart-item-${item.id}`}
                  aria-describedby={`cart-item-details-${item.id}`}
                >
                  <CardContent className="p-4 md:p-6">
                    <div className="flex gap-3 md:gap-4">
                      {/* Clickable product image and info */}
                      <Link 
                        to={`/products/${item.product.id}`}
                        className="flex gap-3 md:gap-4 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <TooltipWrapper content={`Voir les détails de ${item.product.name}`} disabled={isMobile}>
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 hover:scale-105 transition-transform">
                            <img
                              src={item.product.images[0] || '/placeholder.svg'}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </TooltipWrapper>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 mr-2">
                              <h3 
                                id={`cart-item-${item.id}`}
                                className="font-medium text-stone-800 text-sm md:text-base leading-tight hover:text-olive-700 transition-colors"
                              >
                                {item.product.name}
                              </h3>
                              <p className="text-xs md:text-sm text-stone-600 mb-1">{item.product.category}</p>
                              <p 
                                id={`cart-item-details-${item.id}`}
                                className="text-xs text-stone-500 line-clamp-2 mb-1"
                              >
                                {item.product.description || "Produit artisanal berbère fait main avec des matériaux naturels et traditionnels."}
                              </p>
                              {hasStockIssue && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-100 mt-1">
                                  Stock limité ({productStock?.available} disponibles)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                      
                      {/* Remove button */}
                      <TooltipWrapper 
                        content={`Retirer ${item.product.name} du panier`}
                        side="left"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-stone-400 hover:text-red-500 p-2 touch-manipulation min-h-[44px] min-w-[44px] flex-shrink-0"
                          id={`cart-remove-${item.id}`}
                          name={`remove-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                          aria-label={`Retirer ${item.product.name} du panier`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Retirer du panier</span>
                        </Button>
                      </TooltipWrapper>
                    </div>
                    
                     {/* Quantity and price controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                      <div className="flex items-center gap-2 md:gap-3" role="group" aria-label={`Contrôles de quantité pour ${item.product.name}`}>
                        <TooltipWrapper content="Diminuer la quantité">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            id={`cart-qty-minus-${item.id}`}
                            name={`quantity-decrease-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                            aria-label={`Diminuer la quantité de ${item.product.name}`}
                          >
                            <Minus className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                          </Button>
                        </TooltipWrapper>
                        <span 
                          className="w-8 md:w-10 text-center font-medium text-base"
                          aria-label={`Quantité: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <TooltipWrapper content="Augmenter la quantité">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={productStock && item.quantity >= productStock.available}
                            className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            id={`cart-qty-plus-${item.id}`}
                            name={`quantity-increase-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                            aria-label={`Augmenter la quantité de ${item.product.name}`}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
                          </Button>
                        </TooltipWrapper>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p 
                          className="font-medium text-stone-800 text-base md:text-lg"
                          aria-label={`Prix total: ${(item.product.price * item.quantity).toFixed(2)} euros`}
                        >
                          {(item.product.price * item.quantity).toFixed(2)} €
                        </p>
                        <p className="text-xs md:text-sm text-stone-600">{item.product.price.toFixed(2)} € l'unité</p>
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
                <fieldset className="mb-6">
                  <legend className="block text-sm font-medium text-stone-700 mb-2">
                    <Truck className="inline h-4 w-4 mr-1" aria-hidden="true" />
                    Calculer les frais de livraison
                  </legend>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Code postal"
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                      id="shipping-postal-code"
                      name="postal-code-input"
                      aria-label="Entrez votre code postal pour calculer les frais de livraison"
                      aria-describedby="shipping-description"
                    />
                    <TooltipWrapper content="Calculer les frais de livraison pour votre code postal">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckShipping}
                        disabled={shippingLoading}
                        id="shipping-calculator-button"
                        name="calculate-shipping-costs"
                        aria-label="Calculer les frais de livraison"
                      >
                        {shippingLoading ? 'Calcul...' : 'Calculer'}
                      </Button>
                    </TooltipWrapper>
                  </div>
                  <p id="shipping-description" className="sr-only">
                    Entrez votre code postal pour connaître les frais et délais de livraison
                  </p>
                </fieldset>

                {/* Mobile-specific features */}
                {isMobile && (
                  <div className="space-y-6 mb-6">
                    {/* Mobile Payment Buttons */}
                    <MobilePaymentButtons
                      amount={total}
                      currency="EUR"
                      onPaymentSuccess={handlePaymentSuccess}
                      onPaymentError={handlePaymentError}
                      disabled={isCheckingOut || stockIssues.length > 0}
                    />
                    
                    {/* Location-based features */}
                    <LocationBasedFeatures />
                  </div>
                )}

                {/* Traditional checkout button */}
                <TooltipWrapper 
                  content={stockIssues.length > 0 
                    ? "Veuillez corriger les problèmes de stock avant de continuer" 
                    : `Procéder au paiement pour ${total.toFixed(2)} €`
                  }
                >
                  <Link to="/checkout">
                    <Button 
                      className="w-full bg-olive-700 hover:bg-olive-800 text-white py-3 md:py-4 text-base md:text-lg font-medium touch-manipulation min-h-[48px] md:min-h-[56px] flex items-center justify-center"
                      disabled={stockIssues.length > 0 || isCheckingOut}
                      id="cart-checkout-button"
                      name="proceed-to-checkout"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {stockIssues.length > 0 
                        ? 'Corriger le stock d\'abord' 
                        : isMobile 
                          ? 'Commander' 
                          : 'Procéder au Paiement'
                      }
                      {!stockIssues.length && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </Link>
                </TooltipWrapper>

                <div className="mt-4 text-center">
                  <Link to="/products" className="text-olive-700 hover:text-olive-900 text-sm">
                    Continuer mes achats
                  </Link>
                </div>

                {/* Additional useful content for white space */}
                <div className="mt-8 space-y-6 border-t pt-6">
                  {/* Shopping benefits */}
                  <div className="bg-olive-50 rounded-lg p-4">
                    <h3 className="font-medium text-olive-800 mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Pourquoi choisir Rif Raw Straw ?
                    </h3>
                    <div className="space-y-2 text-sm text-olive-700">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Artisanat authentique berbère</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Livraison gratuite dès 50€</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Retours sous 30 jours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>Support client réactif</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated delivery */}
                  <div className="bg-stone-50 rounded-lg p-4">
                    <h4 className="font-medium text-stone-800 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Livraison estimée
                    </h4>
                    <p className="text-sm text-stone-600">
                      Commandez avant 14h pour une expédition le jour même
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      Délai: {calculation?.delivery_estimate || "2-3 jours ouvrés"}
                    </p>
                  </div>

                  {/* Share cart */}
                  <div className="text-center">
                    <TooltipWrapper content="Partager votre panier avec vos proches">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Mon panier Rif Raw Straw',
                              text: `Découvrez ma sélection d'artisanat berbère (${itemCount} articles)`
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('Lien copié !');
                          }
                        }}
                        className="text-stone-600 hover:text-stone-800"
                        id="cart-share-button"
                        name="share-cart-selection"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Partager mon panier
                      </Button>
                    </TooltipWrapper>
                  </div>
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
