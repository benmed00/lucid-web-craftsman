import { useCart } from '@/stores';
import { toast } from 'sonner';
import { appNavigate } from '@/lib/navigation';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { useMemo, useState, useCallback, useEffect } from 'react';
import ProductCard, { StockContext } from './ProductCard';
import { ProductQuickView } from './ProductQuickView';
import { Card, CardContent } from '@/components/ui/card';
import { useBatchStock } from '@/hooks/useBatchStock';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSafetyTimeout } from '@/hooks/useSafetyTimeout';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  useProductsWithTranslations,
  ProductWithTranslation,
  SupportedLocale,
} from '@/hooks/useTranslatedContent';

const ProductShowcase = () => {
  const { t } = useTranslation('products');
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
    null
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch products with translations
  const {
    data: translatedProducts = [],
    isLoading: loading,
    error: fetchError,
  } = useProductsWithTranslations();

  // Unified retry: reset query state completely → forces loading state → refetch
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      // resetQueries (not invalidate) forces isLoading back to true
      await queryClient.resetQueries({ queryKey: ['products'] });
      await queryClient.resetQueries({
        queryKey: ['products-with-translations'],
      });
    } catch {
      // Error handled by React Query
    } finally {
      setTimeout(() => setIsRetrying(false), 500);
    }
  }, [queryClient]);

  // Safety timeout — force out of skeleton after 12s
  const { hasTimedOut: forceRender } = useSafetyTimeout(loading, {
    timeout: 12000,
    slowThreshold: 6000,
  });

  // Create a map of product ID to fallback info
  const fallbackInfo = useMemo(() => {
    const info: Record<number, { isFallback: boolean; locale: string }> = {};
    translatedProducts.forEach((p: ProductWithTranslation) => {
      info[p.id] = { isFallback: p._fallbackUsed, locale: p._locale };
    });
    return info;
  }, [translatedProducts]);

  // Transform to Product interface and get featured products
  const featuredProducts = useMemo(() => {
    return translatedProducts.slice(0, 4).map(
      (p: ProductWithTranslation): Product => ({
        id: p.id,
        name: p.name,
        price: p.price,
        images: p.images,
        category: p.category,
        description: p.description,
        details: p.details,
        care: p.care,
        artisan: p.artisan,
        is_new: p.is_new ?? false,
        is_available: p.is_available ?? true,
        stock_quantity: p.stock_quantity ?? 0,
        artisan_story: p.artisan_story ?? undefined,
        short_description: p.short_description ?? undefined,
        rating_average: p.rating_average ?? undefined,
        rating_count: p.rating_count ?? undefined,
      })
    );
  }, [translatedProducts]);

  // Batch stock loading — deferred until products have rendered
  const productIds = featuredProducts.map((p) => p.id);
  const { stockMap } = useBatchStock({
    productIds,
    enabled: productIds.length > 0 && !loading,
  });

  // Handle URL-based quick view state
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && featuredProducts.length > 0) {
      const productIdNum = parseInt(productId, 10);
      const product = featuredProducts.find((p) => p.id === productIdNum);
      if (product) {
        setQuickViewProduct(product);
      } else {
        // Try to find in all translated products
        const allProducts = translatedProducts.map(
          (p: ProductWithTranslation): Product => ({
            id: p.id,
            name: p.name,
            price: p.price,
            images: p.images,
            category: p.category,
            description: p.description,
            details: p.details,
            care: p.care,
            artisan: p.artisan,
            is_new: p.is_new ?? false,
            is_available: p.is_available ?? true,
            stock_quantity: p.stock_quantity ?? 0,
          })
        );
        const foundProduct = allProducts.find((p) => p.id === productIdNum);
        if (foundProduct) {
          setQuickViewProduct(foundProduct);
        }
      }
    } else {
      setQuickViewProduct(null);
    }
  }, [searchParams, featuredProducts, translatedProducts]);

  const handleAddToCart = async (product: Product) => {
    try {
      const response = await import('@/api/mockApiService').then((api) =>
        api.addToCart(product, 1)
      );

      if (response.success) {
        addItem(product, 1);
        toast.success(
          t('recommendations.addedToCart', { name: product.name }),
          {
            action: {
              label: t('common:buttons.viewCart', 'Voir le panier'),
              onClick: () => {
                appNavigate('/cart');
              },
            },
          }
        );
      } else {
        toast.error(t('recommendations.addError'));
      }
    } catch (error) {
      toast.error(t('recommendations.addError'));
    }
  };

  const handleQuickView = useCallback(
    (product: Product) => {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('product', product.id.toString());
      setSearchParams(newSearchParams, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  const handleCloseQuickView = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('product');
    setSearchParams(newSearchParams, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleQuickViewAddToCart = async (
    product: Product,
    quantity: number
  ) => {
    try {
      const response = await import('@/api/mockApiService').then((api) =>
        api.addToCart(product, quantity)
      );

      if (response.success) {
        addItem(product, quantity);
      } else {
        toast.error(t('recommendations.addError'));
      }
    } catch (error) {
      toast.error(t('recommendations.addError'));
    }
  };

  // Loading state with safety timeout escape hatch
  if (loading && !forceRender) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-fade-in"
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          >
            <Card className="bg-card border-none overflow-hidden animate-pulse rounded-xl shadow-md">
              <div className="aspect-square sm:aspect-[4/5] w-full bg-gradient-to-br from-muted to-muted/50 rounded-t-xl"></div>
              <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="h-3 bg-gradient-to-r from-muted to-muted/50 rounded-full w-2/3"></div>
                <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded w-4/5"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-gradient-to-r from-muted to-muted/50 rounded w-1/2"></div>
                  <div className="h-10 bg-gradient-to-r from-muted to-muted/50 rounded-lg w-full"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  // Error or timeout-with-no-data state
  const showError =
    (fetchError || (forceRender && loading)) && featuredProducts.length === 0;
  if (showError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">
          {t('showcase.loadError', 'Impossible de charger les produits.')}
        </p>
        <Button
          variant="outline"
          onClick={handleRetry}
          disabled={isRetrying}
          className="gap-2"
        >
          {isRetrying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRetrying
            ? t('common:messages.loading', 'Chargement…')
            : t('common:buttons.retry')}
        </Button>
      </div>
    );
  }

  // Empty state (loaded but no products)
  if (!loading && featuredProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {t('showcase.empty', 'Aucun produit disponible pour le moment.')}
        </p>
      </div>
    );
  }

  return (
    <StockContext.Provider value={stockInfo || {}}>
      <section
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
        aria-label={t('showcase.ariaLabel')}
      >
        {featuredProducts.map((product, index) => (
          <article
            key={product.id}
            className="animate-fade-in"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
            aria-labelledby={`product-${product.id}-name`}
          >
            <ProductCard
              product={product}
              onAddToCart={handleAddToCart}
              onQuickView={handleQuickView}
              isFallback={fallbackInfo[product.id]?.isFallback}
              fallbackLocale={
                fallbackInfo[product.id]?.locale as SupportedLocale
              }
            />
          </article>
        ))}
      </section>

      <ProductQuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={handleCloseQuickView}
        onAddToCart={handleQuickViewAddToCart}
      />
    </StockContext.Provider>
  );
};

export default ProductShowcase;
