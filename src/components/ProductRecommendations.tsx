import { useMemo } from 'react';
import { useProductRecommendations } from '@/hooks/useProductRecommendations';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCart } from '@/stores';
import { toast } from 'sonner';
import { appNavigate } from '@/lib/navigation';
import ProductCard, { StockContext } from './ProductCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { useTranslation } from 'react-i18next';
import { useBatchStock } from '@/hooks/useBatchStock';

interface ProductRecommendationsProps {
  currentProduct?: Product;
  allProducts: Product[];
  title?: string;
  maxRecommendations?: number;
  onQuickView?: (product: Product) => void;
}

export const ProductRecommendations = ({
  currentProduct,
  allProducts,
  title,
  maxRecommendations = 6,
  onQuickView,
}: ProductRecommendationsProps) => {
  const { recentlyViewed } = useRecentlyViewed();
  const { addItem } = useCart();
  const { t } = useTranslation(['products', 'common']);

  const recommendations = useProductRecommendations({
    currentProduct,
    allProducts,
    recentlyViewed,
    maxRecommendations,
  });

  // Batch stock query for all recommendations
  const productIds = useMemo(
    () => recommendations.map((p) => p.id),
    [recommendations]
  );
  const { stockMap } = useBatchStock({
    productIds,
    enabled: productIds.length > 0,
  });

  const displayTitle = title || t('recommendations.title');

  const handleAddToCart = async (product: Product) => {
    try {
      const response = await import('@/api/mockApiService').then((api) =>
        api.addToCart(product, 1)
      );

      if (response.success) {
        addItem(product, 1);
        toast.success(t('common:messages.addedToCart'), {
          action: {
            label: t('common:buttons.viewCart', 'Voir le panier'),
            onClick: () => {
              appNavigate('/cart');
            },
          },
        });
      } else {
        toast.error(t('recommendations.addError'));
      }
    } catch (error) {
      toast.error(t('recommendations.addError'));
    }
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <StockContext.Provider value={stockMap}>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {displayTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {recommendations.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
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
    </StockContext.Provider>
  );
};
