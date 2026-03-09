import {
  Tag,
  Loader2,
  X,
  Truck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCurrency } from '@/stores/currencyStore';

interface CartItem {
  product: {
    id: number;
    name: string;
    price: number;
    images: string[];
  };
  quantity: number;
}

interface DiscountCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  includes_free_shipping?: boolean;
}

interface CheckoutOrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  hasFreeShipping: boolean;
  shippingCost: number;
  freeShippingSettings: { amount: number; enabled: boolean };
  appliedCoupon: DiscountCoupon | null;
  promoCode: string;
  promoError: string;
  isValidatingPromo: boolean;
  onPromoCodeChange: (code: string) => void;
  onValidatePromo: () => void;
  onRemovePromo: () => void;
}

const CheckoutOrderSummary = ({
  cartItems,
  subtotal,
  discount,
  shipping,
  total,
  hasFreeShipping,
  shippingCost,
  freeShippingSettings,
  appliedCoupon,
  promoCode,
  promoError,
  isValidatingPromo,
  onPromoCodeChange,
  onValidatePromo,
  onRemovePromo,
}: CheckoutOrderSummaryProps) => {
  const { t } = useTranslation('checkout');
  const { formatPrice } = useCurrency();

  return (
    <div className="lg:col-span-1">
      <div className="border border-border rounded-lg p-6 bg-secondary sticky top-8">
        <h3 className="font-serif text-xl text-foreground mb-4">
          {t('cart.title')}
        </h3>

        {/* Order Items */}
        <div className="space-y-4 mb-6">
          {cartItems.map((item, index) => (
            <div
              key={item.product.id || index}
              className="flex items-center"
            >
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
                  {t('cart.updateQuantity')}: {item.quantity}
                </div>
              </div>
              <div className="text-primary font-medium">
                {formatPrice(item.product.price)}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Promo Code Section */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 flex items-center gap-1">
            <Tag className="h-4 w-4" />
            {t('promo.label')}
          </Label>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-md p-3 mt-2">
              <div>
                <span className="font-medium text-primary">
                  {appliedCoupon.code}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {appliedCoupon.type === 'percentage'
                    ? `-${appliedCoupon.value}%`
                    : `-${formatPrice(appliedCoupon.value)}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onRemovePromo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 mt-2">
              <Input
                placeholder={t('promo.placeholder')}
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
                className="flex-1 uppercase"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onValidatePromo();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onValidatePromo}
                disabled={isValidatingPromo || !promoCode.trim()}
                className="shrink-0"
              >
                {isValidatingPromo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('promo.apply')
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
            <span className="text-muted-foreground">{t('cart.subtotal')}</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-primary">
              <span>{t('cart.discount')}</span>
              <span className="font-medium">-{formatPrice(discount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t('cart.shipping')}
            </span>
            {hasFreeShipping ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through text-sm">
                  {formatPrice(shippingCost)}
                </span>
                <span className="font-medium text-primary flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {t('cart.shippingFree')}
                </span>
              </div>
            ) : (
              <span className="font-medium">{formatPrice(shipping)}</span>
            )}
          </div>

          {/* Free shipping progress hint */}
          {!hasFreeShipping &&
            freeShippingSettings.enabled &&
            subtotal > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <Truck className="h-3 w-3 inline mr-1" />
                {t('shipping.freeFrom', {
                  amount: formatPrice(freeShippingSettings.amount - subtotal),
                })}
              </div>
            )}
          <Separator className="my-2" />
          <div className="flex justify-between text-lg">
            <span className="font-medium">{t('cart.total')}</span>
            <span className="font-medium text-primary">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-background p-3 rounded-md border border-border mt-6">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span>{t('payment.securePayment')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOrderSummary;
