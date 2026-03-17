import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useSafetyTimeout } from '@/hooks/useSafetyTimeout';
import { useBatchStock } from '@/hooks/useBatchStock';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdvancedProductFilters } from '@/hooks/useAdvancedProductFilters';
import {
  useProductsWithTranslations,
  ProductWithTranslation,
  SupportedLocale,
} from '@/hooks/useTranslatedContent';
import { useCart } from '@/stores';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { appNavigate } from '@/lib/navigation';

const PRODUCTS_PER_PAGE = 16;

export function useProductsPage() {
  const { t } = useTranslation(['products', 'common']);
  const [searchParams] = useSearchParams();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
    null
  );
  const { addItem, cart } = useCart();
  const isMobile = useIsMobile();

  const currentPage = Math.max(
    1,
    parseInt(searchParams.get('page') || '1', 10)
  );

  const {
    data: translatedProducts = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useProductsWithTranslations();

  const { hasTimedOut: forceRender, isSlowLoading } = useSafetyTimeout(
    loading,
    {
      timeout: 10000,
      slowThreshold: 4000,
      onTimeout: () =>
        console.warn('[Products] Loading timed out after 10s, rendering page'),
      onSlowLoading: () =>
        console.info('[Products] Loading is slow, showing indicator'),
    }
  );

  const fallbackInfo = useMemo(() => {
    const info: Record<
      number,
      { isFallback: boolean; locale: SupportedLocale }
    > = {};
    translatedProducts.forEach((p: ProductWithTranslation) => {
      info[p.id] = { isFallback: p._fallbackUsed, locale: p._locale };
    });
    return info;
  }, [translatedProducts]);

  const products = useMemo(
    () =>
      translatedProducts.map(
        (p): Product => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          images: p.images,
          category: p.category,
          artisan: p.artisan,
          details: p.details,
          care: p.care,
          is_new: p.is_new ?? false,
          is_available: p.is_available ?? true,
          stock_quantity: p.stock_quantity ?? 0,
          rating_average: p.rating_average ?? 0,
          rating_count: p.rating_count ?? 0,
        })
      ),
    [translatedProducts]
  );

  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { stockMap } = useBatchStock({
    productIds,
    enabled: products.length > 0,
  });

  const error = fetchError ? t('fetch.error') : null;

  const {
    filters,
    filteredProducts,
    availableOptions,
    searchHistory,
    isLoading: filterLoading,
    isSearchStale,
    updateFilters,
    resetFilters,
    clearFilter,
    getSearchSuggestions,
    activeFiltersCount,
    totalProducts: totalProductsCount,
    filteredCount,
    getCacheStats,
    invalidateCache,
  } = useAdvancedProductFilters({
    products,
    enableAnalytics: true,
    debounceMs: 300,
  });

  const cacheStats = getCacheStats?.() ?? {
    cachedQueries: 0,
    totalCacheSize: 0,
  };

  const handleClearCache = () => {
    invalidateCache?.();
    toast.success(t('cache.cleared'));
  };

  const {
    visibleItems: visibleProducts,
    hasMore,
    isLoading: isLoadingMore,
    sentinelRef,
  } = useInfiniteScroll({
    items: filteredProducts,
    itemsPerPage: isMobile ? 8 : 16,
  });

  const handleRefresh = async () => {
    try {
      const result = await refetch();
      if (result.status === 'success') {
        toast.success(t('refresh.success'));
      }
    } catch {
      toast.error(t('common:messages.error'));
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const displayCategories = useMemo(
    () => availableOptions.categories,
    [availableOptions.categories]
  );

  const handleAddToCart = (product: Product, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    addItem(product, 1);
    toast.success(t('recommendations.addedToCart', { name: product.name }), {
      duration: 3000,
      action: {
        label: t('common:buttons.viewCart', 'Voir le panier'),
        onClick: () => {
          appNavigate('/cart');
        },
      },
    });
  };

  const handleQuickView = (product: Product) => setQuickViewProduct(product);

  const handleVoiceSearch = (query: string) =>
    updateFilters({ searchQuery: query });

  const handleQuickViewAddToCart = (product: Product, quantity: number) => {
    addItem(product, quantity);
    toast.success(
      t('recommendations.addedToCartQuantity', {
        name: product.name,
        quantity,
      }),
      {
        duration: 3000,
        action: {
          label: t('common:buttons.viewCart', 'Voir le panier'),
          onClick: () => {
            appNavigate('/cart');
          },
        },
      }
    );
    setQuickViewProduct(null);
  };

  // NOTE: Auto-refetch on timeout was REMOVED — it caused a refetch loop
  // that cancelled in-flight queries. React Query's own retry handles transient failures.

  const cartTotal = cart.items.reduce(
    (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
    0
  );
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  return {
    // State
    quickViewProduct,
    setQuickViewProduct,
    // Data
    products,
    filteredProducts,
    fallbackInfo,
    stockMap,
    // Loading
    loading,
    forceRender,
    isSlowLoading,
    error,
    filterLoading,
    isSearchStale,
    // Filters
    filters,
    availableOptions,
    searchHistory,
    displayCategories,
    activeFiltersCount,
    totalProductsCount,
    filteredCount,
    updateFilters,
    resetFilters,
    clearFilter,
    getSearchSuggestions,
    cacheStats,
    handleClearCache,
    // Infinite scroll
    visibleProducts,
    hasMore,
    isLoadingMore,
    sentinelRef,
    // Actions
    handleAddToCart,
    handleQuickView,
    handleQuickViewAddToCart,
    handleVoiceSearch,
    handleRefresh,
    refetch,
    // SEO / pagination
    currentPage,
    totalPages,
    PRODUCTS_PER_PAGE,
    // Misc
    isMobile,
    cartTotal,
    t,
  };
}
