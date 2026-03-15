import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { StockContext } from '@/components/ProductCard';
import { SearchResultsHeader } from '@/components/SearchResults';
import FloatingCartButton from '@/components/ui/FloatingCartButton';
import { CompareFloatingBar } from '@/components/products/CompareFloatingBar';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { VoiceSearch } from '@/components/ui/VoiceSearch';
import { MobilePromotions } from '@/components/ui/MobilePromotions';
import { AdvancedProductFilters } from '@/components/AdvancedProductFilters';
import { ProductQuickView } from '@/components/ProductQuickView';
import { RecentlyViewedProducts } from '@/components/RecentlyViewedProducts';
import { ProductRecommendations } from '@/components/ProductRecommendations';
import { toast } from 'sonner';

import { ProductsHeroBanner } from '@/components/products/ProductsHeroBanner';
import { ProductsCategoryFilters } from '@/components/products/ProductsCategoryFilters';
import { ProductsGrid } from '@/components/products/ProductsGrid';
import { ProductsLoadingSkeleton } from '@/components/products/ProductsLoadingSkeleton';
import { useProductsPage } from '@/hooks/useProductsPage';

const Products = () => {
  const page = useProductsPage();
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);

  // Enterprise retry: cancel → reset → refetch
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // 1. Cancel any in-flight product queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['products'] });
      // 2. Reset queries: clears error state AND cached data, forces fresh isLoading
      await queryClient.resetQueries({ queryKey: ['products'] });
      // 3. Refetch triggers a clean network request
      await page.refetch();
    } catch (err) {
      console.warn('[Products] Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  // Loading state (skeleton)
  if (page.loading && !page.forceRender) {
    return (
      <ProductsLoadingSkeleton
        isMobile={page.isMobile}
        isSlowLoading={page.isSlowLoading}
        onRetry={handleRetry}
      />
    );
  }

  // Error OR timeout-with-no-data state → show error UI with retry
  const showError = (page.error || (page.forceRender && page.loading)) && page.products.length === 0;
  if (showError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-serif text-foreground mb-4">
              {page.t('common:messages.error')}
            </h1>
            <p className="text-muted-foreground mb-8">
              {page.error || page.t('common:messages.timeout')}
            </p>
            <Button onClick={handleRetry} disabled={isRetrying} className="gap-2">
              {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isRetrying ? page.t('common:messages.loading', 'Chargement…') : page.t('common:buttons.retry')}
            </Button>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title={
          page.currentPage > 1
            ? `${page.t('title')} - Page ${page.currentPage} | Rif Raw Straw`
            : `${page.t('title')} | Rif Raw Straw`
        }
        description={page.t('subtitle')}
        keywords={page.t('seo.keywords', { returnObjects: true }) as string[]}
        url={page.currentPage > 1 ? `/products?page=${page.currentPage}` : '/products'}
        type="website"
        pagination={{
          currentPage: page.currentPage,
          totalPages: page.totalPages,
          baseUrl: '/products',
        }}
      />

      <ProductsHeroBanner />

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 safe-area">
        {/* Mobile Features */}
        {page.isMobile && (
          <div className="space-y-6 mb-6">
            <VoiceSearch
              onSearch={page.handleVoiceSearch}
              placeholder={page.t('filters.searchPlaceholder')}
            />
            <MobilePromotions
              cartTotal={page.cartTotal}
              onPromotionApply={(code) => toast.success(page.t('promo.applied', { code }))}
            />
          </div>
        )}

        {/* Filters */}
        <AdvancedProductFilters
          filters={page.filters}
          availableOptions={page.availableOptions}
          searchHistory={page.searchHistory}
          isLoading={page.filterLoading}
          totalProducts={page.totalProductsCount}
          filteredCount={page.filteredCount}
          activeFiltersCount={page.activeFiltersCount}
          onFiltersChange={page.updateFilters}
          onResetFilters={page.resetFilters}
          onClearFilter={page.clearFilter}
          getSearchSuggestions={page.getSearchSuggestions}
          onClearCache={page.handleClearCache}
          cacheStats={page.cacheStats}
        />

        <SearchResultsHeader
          searchQuery={page.filters.searchQuery}
          totalResults={page.filteredCount}
          showingCount={page.isMobile ? page.visibleProducts.length : page.filteredCount}
        />

        <ProductsCategoryFilters
          filters={page.filters}
          displayCategories={page.displayCategories}
          products={page.products}
          totalProductsCount={page.totalProductsCount}
          updateFilters={page.updateFilters}
        />

        {/* Products Grid */}
        <StockContext.Provider value={page.stockMap}>
          <PullToRefresh onRefresh={page.handleRefresh} disabled={page.loading}>
            <ProductsGrid
              filteredProducts={page.filteredProducts}
              visibleProducts={page.visibleProducts}
              fallbackInfo={page.fallbackInfo}
              isMobile={page.isMobile}
              isSearchStale={page.isSearchStale}
              hasMore={page.hasMore}
              isLoadingMore={page.isLoadingMore}
              sentinelRef={page.sentinelRef}
              filters={page.filters}
              onAddToCart={page.handleAddToCart}
              onQuickView={page.handleQuickView}
              onResetFilters={page.resetFilters}
            />
          </PullToRefresh>
        </StockContext.Provider>

        {/* CTA */}
        {page.filteredProducts.length > 0 && (
          <div className="text-center py-16 border-t border-border">
            <h2 className="font-serif text-2xl text-foreground mb-4">{page.t('cta.title')}</h2>
            <p className="text-muted-foreground mb-6">{page.t('cta.description')}</p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/contact" className="inline-flex items-center">
                {page.t('cta.button')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-16">
          <RecentlyViewedProducts onQuickView={page.setQuickViewProduct} />
        </div>
        <div className="mt-16">
          <ProductRecommendations
            allProducts={page.products}
            title={page.t('recommendations.title')}
            maxRecommendations={8}
            onQuickView={page.setQuickViewProduct}
          />
        </div>
      </div>

      {page.quickViewProduct && (
        <ProductQuickView
          product={page.quickViewProduct}
          isOpen={!!page.quickViewProduct}
          onClose={() => page.setQuickViewProduct(null)}
          onAddToCart={page.handleQuickViewAddToCart}
        />
      )}

      <PageFooter />
      <FloatingCartButton />
      <CompareFloatingBar />
    </div>
  );
};

export default Products;
