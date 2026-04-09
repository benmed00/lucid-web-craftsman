import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useCurrency } from '@/stores';

interface MobileStickyAddToCartProps {
  price: number;
  onAddToCart: () => void;
  disabled?: boolean;
  /** Pixel offset from top before bar appears */
  showAfter?: number;
}

const MobileStickyAddToCart = ({
  price,
  onAddToCart,
  disabled = false,
  showAfter = 400,
}: MobileStickyAddToCartProps) => {
  const { t } = useTranslation('products');
  const { formatPrice } = useCurrency();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [showAfter]);

  return (
    <div
      className={`mobile-sticky-cta md:hidden ${visible ? '' : 'hidden-bar'}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <span className="text-lg font-bold text-foreground">
            {formatPrice(price)}
          </span>
        </div>
        <Button
          onClick={onAddToCart}
          disabled={disabled}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full min-h-[50px] text-sm tracking-wide"
        >
          <ShoppingBag className="h-4 w-4 mr-2" />
          {disabled
            ? t('details.outOfStock', 'Rupture de stock')
            : t('details.addToCart', 'Ajouter au panier')}
        </Button>
      </div>
    </div>
  );
};

export default MobileStickyAddToCart;
