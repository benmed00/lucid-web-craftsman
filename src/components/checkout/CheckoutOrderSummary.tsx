import {
  Tag,
  Loader2,
  X,
  Truck,
  CheckCircle,
  ShieldCheck,
  Lock,
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
      <div className="border border-border rounded-xl p-6 bg-card shadow-sm sticky top-8">
        <h3 className="font-serif text-xl text-foreground mb-5 flex items-center gap-2">
          {t('cart.title')}
        </h3>

        {/* Order Items */}
        <div className="space-y-4 mb-6">
          {cartItems.map((item, index) => (
            <div
              key={item.product.id || index}
              className="flex items-center gap-4 group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 border border-border flex-shrink-0">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">
                  {item.product.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('cart.updateQuantity')}: {item.quantity}
                </p>
              </div>
              <div className="text-sm font-semibold text-foreground whitespace-nowrap">
                {formatPrice(item.product.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Promo Code Section */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            {t('promo.label')}
          </Label>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
              <div>
                <span className="font-semibold text-primary text-sm">
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
                onChange={(e) =>
                  onPromoCodeChange(e.target.value.toUpperCase())
                }
                className="flex-1 uppercase text-sm"
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
                className="shrink-0 h-10"
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
            <p className="text-xs text-destructive mt-1.5">{promoError}</p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Order Totals */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cart.subtotal')}</span>
            <span className="font-medium text-foreground">
              {formatPrice(subtotal)}
            </span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-primary">{t('cart.discount')}</span>
              <span className="font-medium text-primary">
                -{formatPrice(discount)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('cart.shipping')}</span>
            {hasFreeShipping ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through text-xs">
                  {formatPrice(shippingCost)}
                </span>
                <span className="font-medium text-primary flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {t('cart.shippingFree')}
                </span>
              </div>
            ) : (
              <span className="font-medium text-foreground">
                {formatPrice(shipping)}
              </span>
            )}
          </div>

          {/* Free shipping progress */}
          {!hasFreeShipping && freeShippingSettings.enabled && subtotal > 0 && (
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
              <Truck className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <span>
                {t('shipping.freeFrom', {
                  amount: formatPrice(freeShippingSettings.amount - subtotal),
                })}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between pt-1">
            <span className="text-base font-semibold text-foreground">
              {t('cart.total')}
            </span>
            <span className="text-lg font-bold text-primary">
              {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-muted/30 rounded-lg p-4 mt-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            <span>{t('payment.securePayment')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>{t('payment.ssl')}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <span>{t('payment.secureLabel')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOrderSummary;
