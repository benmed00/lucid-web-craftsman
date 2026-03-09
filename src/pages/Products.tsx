import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { StockContext } from '@/components/ProductCard';
import { SearchResultsHeader } from '@/components/SearchResults';
import FloatingCartButton from '@/components/ui/FloatingCartButton';
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

  // Loading state
  if (page.loading && !page.forceRender) {
    return (
      <ProductsLoadingSkeleton
        isMobile={page.isMobile}
        isSlowLoading={page.isSlowLoading}
        onRetry={() => page.refetch()}
      />
    );
  }

  // Error state
  if (page.error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-serif text-foreground mb-4">
              {page.t('common:messages.error')}
            </h1>
            <p className="text-muted-foreground mb-8">{page.error}</p>
            <Button onClick={() => window.location.reload()}>
              {page.t('common:buttons.retry')}
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
    </div>
  );
};

export default Products;
