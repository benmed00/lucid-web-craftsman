import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCart } from '@/stores';
import { useBusinessRules } from '@/hooks/useBusinessRules';
import { useCurrency } from '@/stores/currencyStore';
import { useCheckoutResume } from '@/hooks/useCheckoutResume';

import Footer from '@/components/Footer';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Minus,
  Plus,
  X,
  ShoppingBag,
  ArrowRight,
  Truck,
  AlertCircle,
  CreditCard,
  Heart,
  Share2,
  Clock,
  Phone,
  Mail,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShipping } from '@/hooks/useShipping';
import { useStock } from '@/hooks/useStock';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// Mock API calls removed - cart state is now fully managed by Zustand store
import FloatingCartButton from '@/components/ui/FloatingCartButton';
import { MobilePaymentButtons } from '@/components/ui/MobilePaymentButtons';
import { LocationBasedFeatures } from '@/components/ui/LocationBasedFeatures';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { useIsMobile } from '@/hooks/use-mobile';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RemainingSlots } from '@/components/ui/RemainingSlots';

const Cart = () => {
  const { t } = useTranslation(['checkout', 'common']);
  const {
    cart,
    itemCount,
    totalPrice,
    clearCart,
    updateItemQuantity,
    removeItem,
  } = useCart();
  const { rules } = useBusinessRules();
  const { formatPrice, currency } = useCurrency();
  const { hasPendingCheckout, savedStep } = useCheckoutResume();
  const [postalCode, setPostalCode] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const {
    calculation,
    loading: shippingLoading,
    loadZones,
  } = useShipping({ postalCode, orderAmount: totalPrice });
  const isMobile = useIsMobile();

  // Dynamic business rules
  const maxQuantityPerItem = rules.cart.maxQuantityPerItem;
  const highValueThreshold = rules.cart.highValueThreshold;
  const vipPhone = rules.contact.vipPhone;

  // cart.items from useCart() already filters out invalid items (missing product data)
  // No additional filtering needed here

  // Get all product IDs from cart for bulk stock checking
  const productIds = cart.items.map((item) => item.product.id);
  const { stockInfo, canOrderQuantity } = useStock({
    productIds,
    enabled: productIds.length > 0,
  });

  const handlePaymentSuccess = (paymentMethod: string) => {
    toast.success(t('cart.paymentSuccess', { method: paymentMethod }));
    // Clear cart and redirect
    clearCart();
    setTimeout(() => {
      window.location.href = '/payment-success';
    }, 1500);
  };

  const handlePaymentError = (error: string) => {
    toast.error(error);
    setIsCheckingOut(false);
  };

  // Check stock for all items and get any issues
  const stockIssues = useMemo(() => {
    const issues: {
      productId: number;
      available: number;
      requested: number;
    }[] = [];

    if (stockInfo && typeof stockInfo === 'object') {
      cart.items.forEach((item) => {
        const productStock = stockInfo[item.product.id];
        if (productStock && productStock.isOutOfStock) {
          issues.push({
            productId: item.product.id,
            available: productStock.available,
            requested: item.quantity,
          });
        }
      });
    }

    return issues;
  }, [cart.items, stockInfo]);

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }

    // Direct store update - Zustand handles persistence and sync
    updateItemQuantity(itemId, newQuantity);
    toast.success(t('cart.quantityUpdated'));
  };

  const handleRemoveItem = (itemId: number) => {
    // Direct store update - Zustand handles persistence and sync
    removeItem(itemId);
    toast.success(t('cart.itemRemoved'));
  };

  const handleCheckShipping = () => {
    if (!postalCode.trim()) {
      toast.error(t('cart.enterPostalCode'));
      return;
    }
    loadZones();
  };

  const subtotal = totalPrice;
  const shippingCost = calculation?.cost || 0;
  const total = subtotal + shippingCost;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHelmet
          title={t('cart.title') + ' - Rif Raw Straw'}
          description={t('cart.emptyMessage')}
          keywords={['panier', 'achat', 'commande', 'artisanat berbère']}
          url="/cart"
          type="website"
        />
        <main id="main-content" className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div
              className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6"
              aria-hidden="true"
            >
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-serif text-foreground mb-4">
              {t('cart.empty')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {t('cart.emptyMessage')}
            </p>
            <Link to="/products">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
                id="empty-cart-shop-button"
                name="start-shopping-button"
                aria-label={t('cart.continueShopping')}
              >
                {t('cart.continueShopping')}
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
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title={`${t('cart.title')} (${itemCount}) - Rif Raw Straw`}
        description={t('cart.emptyMessage')}
        keywords={['panier', 'achat', 'commande', 'artisanat berbère']}
        url="/cart"
        type="website"
      />

      <main
        id="main-content"
        className="container mx-auto px-4 py-4 md:py-8 safe-area"
      >
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif text-foreground mb-2">
                {t('cart.title')}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground" aria-live="polite">
                  {t('cart.itemCount', { count: itemCount })}
                </p>
                <RemainingSlots
                  current={cart.items.length}
                  max={rules.cart.maxProductTypes}
                  label={t('cart.slots.products')}
                />
              </div>
            </div>
            {cart.items.length > 0 && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('cart.clearCart')}
                  </Button>
                }
                title={t('cart.clearCart')}
                description={t('cart.clearCartConfirm')}
                confirmLabel={t('common:buttons.confirm')}
                onConfirm={() => {
                  clearCart();
                  toast.success(t('common:messages.success'));
                }}
              />
            )}
          </div>
        </div>

        {/* Resume checkout banner */}
        {hasPendingCheckout && (
          <Alert className="mb-6 border-primary/50 bg-primary/5" role="status">
            <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
            <AlertTitle className="text-primary font-medium">
              {t('cart.pendingCheckout.title')}
            </AlertTitle>
            <AlertDescription className="text-foreground mt-2">
              <p className="mb-3 text-muted-foreground">
                {t('cart.pendingCheckout.message')}
              </p>
              <Link to="/checkout">
                <Button size="sm" className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {t('cart.pendingCheckout.resume')} (
                  {t('cart.pendingCheckout.step', {
                    current: savedStep,
                    total: 3,
                  })}
                  )
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {stockIssues.length > 0 && (
          <Alert
            className="mb-6 border-destructive/50 bg-destructive/10"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle
              className="h-4 w-4 text-destructive"
              aria-hidden="true"
            />
            <AlertDescription className="text-destructive">
              {t('cart.stockAlert')}
            </AlertDescription>
          </Alert>
        )}

        {/* High-value order VIP contact message */}
        {totalPrice >= highValueThreshold && (
          <Alert className="mb-6 border-primary/50 bg-primary/10" role="status">
            <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
            <AlertTitle className="text-primary font-medium">
              {t('cart.vip.title')}
            </AlertTitle>
            <AlertDescription className="text-foreground mt-2">
              <p className="mb-3">
                {t('cart.vip.description', { threshold: highValueThreshold })}
              </p>
              <p className="mb-4 text-muted-foreground">
                {t('cart.vip.contact')}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/contact">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />
                    {t('cart.vip.emailButton')}
                  </Button>
                </Link>
                <a href={`tel:${vipPhone}`}>
                  <Button variant="default" size="sm" className="gap-2">
                    <Phone className="h-4 w-4" />
                    {t('cart.vip.callButton')}
                  </Button>
                </a>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 md:space-y-4">
            {cart.items.map((item) => {
              const productStock =
                stockInfo && typeof stockInfo === 'object'
                  ? stockInfo[item.product.id]
                  : null;
              const hasStockIssue = stockIssues.find(
                (issue) => issue.productId === item.product.id
              );

              return (
                <Card
                  key={item.id}
                  className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${hasStockIssue ? 'border-amber-500/50 bg-amber-500/10' : ''}`}
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
                        <TooltipWrapper
                          content={t('cart.viewDetails', {
                            name: item.product.name,
                          })}
                          disabled={isMobile}
                        >
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0 hover:scale-105 transition-transform">
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
                                className="font-medium text-foreground text-sm md:text-base leading-tight hover:text-primary transition-colors"
                              >
                                {item.product.name}
                              </h3>
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">
                                {item.product.category}
                              </p>
                              <p
                                id={`cart-item-details-${item.id}`}
                                className="text-xs text-muted-foreground line-clamp-2 mb-1"
                              >
                                {item.product.description ||
                                  t('cart.defaultDescription')}
                              </p>
                              {hasStockIssue && (
                                <Badge
                                  variant="outline"
                                  className="text-destructive border-destructive/30 bg-destructive/10 mt-1"
                                >
                                  {t('cart.stockLimited', {
                                    available: productStock?.available,
                                  })}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* Remove button with confirmation */}
                      <ConfirmDialog
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive p-2 touch-manipulation min-h-[44px] min-w-[44px] flex-shrink-0"
                            id={`cart-remove-${item.id}`}
                            name={`remove-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                            aria-label={t('cart.removeFromCart')}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">
                              {t('cart.removeFromCart')}
                            </span>
                          </Button>
                        }
                        title={t('cart.removeFromCart')}
                        description={t('cart.removeConfirm', {
                          name: item.product.name,
                        })}
                        confirmLabel={t('cart.removeItem')}
                        onConfirm={() => handleRemoveItem(item.id)}
                      />
                    </div>

                    {/* Quantity and price controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                      <div
                        className="flex items-center gap-2 md:gap-3"
                        role="group"
                        aria-label={t('cart.quantityControls', {
                          name: item.product.name,
                        })}
                      >
                        <TooltipWrapper content={t('cart.decreaseQuantity')}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            id={`cart-qty-minus-${item.id}`}
                            name={`quantity-decrease-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                            aria-label={t('cart.decreaseQuantity')}
                          >
                            <Minus
                              className="h-3 w-3 md:h-4 md:w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </TooltipWrapper>
                        <span
                          className="w-8 md:w-10 text-center font-medium text-base"
                          aria-label={`Quantité: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <TooltipWrapper
                          content={
                            item.quantity >= maxQuantityPerItem
                              ? t('cart.maxQuantity', {
                                  max: maxQuantityPerItem,
                                })
                              : t('cart.increaseQuantity')
                          }
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleQuantityChange(item.id, item.quantity + 1)
                            }
                            disabled={
                              (productStock &&
                                item.quantity >= productStock.available) ||
                              item.quantity >= maxQuantityPerItem
                            }
                            className="touch-manipulation min-h-[44px] min-w-[44px] p-2"
                            id={`cart-qty-plus-${item.id}`}
                            name={`quantity-increase-${item.product.name.toLowerCase().replace(/\s+/g, '-')}`}
                            aria-label={t('cart.increaseQuantity')}
                          >
                            <Plus
                              className="h-3 w-3 md:h-4 md:w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </TooltipWrapper>
                        {item.quantity >= maxQuantityPerItem && (
                          <span className="text-xs text-muted-foreground ml-1">
                            max
                          </span>
                        )}
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto">
                        <p
                          className="font-medium text-foreground text-base md:text-lg"
                          aria-label={`Prix total: ${formatPrice(item.product.price * item.quantity)}`}
                        >
                          {formatPrice(item.product.price * item.quantity)}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {formatPrice(item.product.price)} {t('cart.perUnit')}
                        </p>
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
                <h2 className="text-xl font-medium text-foreground mb-4">
                  {t('cart.orderSummary')}
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span>{t('cart.subtotal')}</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {calculation && (
                    <>
                      <div className="flex justify-between">
                        <span>{t('cart.shipping')}</span>
                        <span>
                          {calculation.is_free
                            ? t('cart.shippingFreeLabel')
                            : formatPrice(calculation.cost)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t('cart.deliveryTime')}</span>
                        <span>{calculation.delivery_estimate}</span>
                      </div>
                    </>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between font-medium text-lg">
                      <span>{t('cart.total')}</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                <fieldset className="mb-6">
                  <legend className="block text-sm font-medium text-foreground mb-2">
                    <Truck className="inline h-4 w-4 mr-1" aria-hidden="true" />
                    {t('cart.calculateShipping')}
                  </legend>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder={t('cart.postalCodePlaceholder')}
                      className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      id="shipping-postal-code"
                      name="postal-code-input"
                      aria-label={t('cart.postalCodeAria')}
                      aria-describedby="shipping-description"
                    />
                    <TooltipWrapper content={t('cart.calculateShipping')}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckShipping}
                        disabled={shippingLoading}
                        id="shipping-calculator-button"
                        name="calculate-shipping-costs"
                        aria-label={t('cart.calculateShipping')}
                      >
                        {shippingLoading
                          ? t('cart.calculating')
                          : t('cart.calculateButton')}
                      </Button>
                    </TooltipWrapper>
                  </div>
                  <p id="shipping-description" className="sr-only">
                    {t('cart.postalCodeSrOnly')}
                  </p>
                </fieldset>

                {/* Mobile-specific features */}
                {isMobile && (
                  <div className="space-y-6 mb-6">
                    {/* Mobile Payment Buttons */}
                    <MobilePaymentButtons
                      amount={total}
                      currency={currency}
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
                  content={
                    stockIssues.length > 0
                      ? t('cart.stockAlert')
                      : t('cart.proceedToCheckout')
                  }
                >
                  <Link to="/checkout">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 md:py-4 text-base md:text-lg font-medium touch-manipulation min-h-[48px] md:min-h-[56px] flex items-center justify-center"
                      disabled={stockIssues.length > 0 || isCheckingOut}
                      id="cart-checkout-button"
                      name="proceed-to-checkout"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {stockIssues.length > 0
                        ? t('cart.fixStockFirst')
                        : isMobile
                          ? t('common:buttons.order')
                          : t('cart.proceedToCheckout')}
                      {!stockIssues.length && (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Button>
                  </Link>
                </TooltipWrapper>

                <div className="mt-4 text-center">
                  <Link
                    to="/products"
                    className="text-olive-700 hover:text-olive-900 text-sm"
                  >
                    {t('cart.continueShopping')}
                  </Link>
                </div>

                {/* Additional useful content for white space */}
                <div className="mt-8 space-y-6 border-t pt-6">
                  {/* Shopping benefits */}
                  <div className="bg-secondary rounded-lg p-4">
                    <h3 className="font-medium text-secondary-foreground mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      {t('cart.benefits.title')}
                    </h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('cart.benefits.item1')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('cart.benefits.item2')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('cart.benefits.item3')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{t('cart.benefits.item4')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estimated delivery */}
                  <div className="bg-stone-50 dark:bg-muted rounded-lg p-4">
                    <h4 className="font-medium text-stone-800 dark:text-foreground mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('cart.estimatedDelivery.title')}
                    </h4>
                    <p className="text-sm text-stone-600 dark:text-muted-foreground">
                      {t('cart.estimatedDelivery.orderBefore')}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-muted-foreground mt-1">
                      {t('cart.estimatedDelivery.delay', {
                        estimate:
                          calculation?.delivery_estimate ||
                          t('cart.estimatedDelivery.defaultDelay'),
                      })}
                    </p>
                  </div>

                  {/* Share cart */}
                  <div className="text-center">
                    <TooltipWrapper content={t('cart.shareCart')}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: t('cart.shareCartTitle'),
                              text: t('cart.shareCartText', {
                                count: itemCount,
                              }),
                            });
                          } else {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success(t('cart.linkCopied'));
                          }
                        }}
                        className="text-stone-600 dark:text-muted-foreground hover:text-stone-800 dark:hover:text-foreground"
                        id="cart-share-button"
                        name="share-cart-selection"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        {t('cart.shareCart')}
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
