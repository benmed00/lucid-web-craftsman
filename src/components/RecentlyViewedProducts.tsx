import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCart } from '@/stores';
import { toast } from 'sonner';
import ProductCard from './ProductCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { useTranslation } from 'react-i18next';

interface RecentlyViewedProductsProps {
  onQuickView?: (product: Product) => void;
}

export const RecentlyViewedProducts = ({
  onQuickView,
}: RecentlyViewedProductsProps) => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { addItem } = useCart();
  const { t } = useTranslation(['products', 'common']);

  const handleAddToCart = async (product: Product) => {
    try {
      const response = await import('@/api/mockApiService').then((api) =>
        api.addToCart(product, 1)
      );

      if (response.success) {
        addItem(product, 1);
        toast.success(t('common:messages.addedToCart'));
      } else {
        toast.error(t('recentlyViewed.addError'));
      }
    } catch (error) {
      // Silent error handling for production
      toast.error(t('recentlyViewed.addError'));
    }
  };

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {t('details.recentlyViewed')}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecentlyViewed}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          {t('common:buttons.clear')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recentlyViewed.slice(0, 4).map((product) => (
            <div key={product.id} className="transform scale-95">
              <ProductCard
                product={product}
                onAddToCart={handleAddToCart}
                onQuickView={onQuickView}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
