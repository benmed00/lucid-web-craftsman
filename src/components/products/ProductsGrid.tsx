import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/shared/interfaces/Iproduct.interface';
import type { SupportedLocale } from '@/hooks/useTranslatedContent';

interface ProductsGridProps {
  filteredProducts: Product[];
  visibleProducts: Product[];
  fallbackInfo: Record<number, { isFallback: boolean; locale: SupportedLocale }>;
  isMobile: boolean;
  isSearchStale: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
  filters: { searchQuery: string };
  onAddToCart: (product: Product, event?: React.MouseEvent) => void;
  onQuickView: (product: Product) => void;
  onResetFilters: () => void;
}

export const ProductsGrid = ({
  filteredProducts,
  visibleProducts,
  fallbackInfo,
  isMobile,
  isSearchStale,
  hasMore,
  isLoadingMore,
  sentinelRef,
  filters,
  onAddToCart,
  onQuickView,
  onResetFilters,
}: ProductsGridProps) => {
  const { t } = useTranslation(['products', 'common']);

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mb-8">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="font-serif text-2xl text-foreground mb-4">
            {t('common:messages.noResults')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('common:messages.noResults')}
          </p>
          <Button onClick={onResetFilters} variant="outline">
            {t('filters.clearFilters')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isSearchStale ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('common:messages.loading')}...</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {Array.from({ length: isMobile ? 4 : 8 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="animate-pulse"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-card rounded-lg overflow-hidden border border-border">
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 md:p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-5 bg-muted rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {(isMobile ? visibleProducts : filteredProducts).map((product, index) => (
            <div
              key={product.id}
              className="animate-fade-in mobile-product-card"
              style={{
                animationDelay: `${Math.min(index * 50, 400)}ms`,
                animationFillMode: 'both',
              }}
            >
              <ProductCard
                product={product}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                isFallback={fallbackInfo[product.id]?.isFallback}
                fallbackLocale={fallbackInfo[product.id]?.locale}
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {isMobile && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {isLoadingMore && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('common:messages.loading')}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
