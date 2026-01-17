import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import SEOHelmet from "@/components/seo/SEOHelmet";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import PageFooter from "@/components/PageFooter";
import ProductCard from "@/components/ProductCard";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";
import { ProductQuickView } from "@/components/ProductQuickView";
import { AdvancedProductFilters } from "@/components/AdvancedProductFilters";
import { ProductAnalytics } from "@/components/ProductAnalytics";
import { SearchResultsHeader, HighlightText } from "@/components/SearchResults";
import FloatingCartButton from "@/components/ui/FloatingCartButton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { VoiceSearch } from "@/components/ui/VoiceSearch";
import { MobilePromotions } from "@/components/ui/MobilePromotions";

import { ProductService } from "@/services/productService";
import { useCart } from "@/stores";
import { useAdvancedProductFilters } from "@/hooks/useAdvancedProductFilters";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { toast } from "sonner";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const { addItem } = useCart();
  const isMobile = useIsMobile();

  // Enhanced filters hook with analytics and cache
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
    invalidateCache
  } = useAdvancedProductFilters({ 
    products,
    enableAnalytics: true,
    debounceMs: 300
  });

  // Get cache statistics - force re-render after clearing
  const [cacheCleared, setCacheCleared] = useState(0);
  const cacheStats = useMemo(() => getCacheStats?.(), [getCacheStats, cacheCleared]);

  const handleClearCache = () => {
    invalidateCache?.();
    setCacheCleared(prev => prev + 1); // Force re-render to update stats
    toast.success("Cache de recherche vidé");
  };

  // Infinite scroll for mobile with better performance  
  const {
    visibleItems: visibleProducts,
    hasMore,
    isLoading: isLoadingMore,
    sentinelRef,
  } = useInfiniteScroll({ 
    items: filteredProducts, 
    itemsPerPage: isMobile ? 8 : 16 
  });

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const data = await ProductService.getAllProducts();
      setProducts(data);
      toast.success("Produits mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProducts = async () => {
      try {
        const data = await ProductService.getAllProducts();
        setProducts(data);
        setLoading(false);
        setError(null);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
        setError("Impossible de charger les produits. Veuillez réessayer plus tard.");
      }
    };
    
    fetchProducts();
  }, []);

  // Memoized categories for performance
  const displayCategories = useMemo(() => availableOptions.categories, [availableOptions.categories]);

  const handleAddToCart = (product: Product, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    addItem(product, 1);

    toast.success(`${product.name} ajouté au panier`, {
      duration: 2000,
    });
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const handleVoiceSearch = (query: string) => {
    updateFilters({ searchQuery: query });
  };

  const handleQuickViewAddToCart = (product: Product, quantity: number) => {
    addItem(product, quantity);

    toast.success(`${product.name} ajouté au panier (${quantity}x)`, {
      duration: 2000,
    });

    setQuickViewProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        
        {/* Hero Banner Skeleton */}
        <div className="bg-gradient-to-r from-secondary to-muted py-8 md:py-12 lg:py-16">
          <div className="container mx-auto px-4 text-center animate-pulse">
            <div className="h-8 md:h-10 lg:h-12 bg-muted-foreground/20 rounded w-80 mx-auto mb-3 md:mb-4"></div>
            <div className="h-5 md:h-6 bg-muted-foreground/20 rounded w-96 mx-auto max-w-2xl"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 safe-area">
          {/* Mobile Features Skeleton */}
          {isMobile && (
            <div className="space-y-6 mb-6 animate-pulse">
              <div className="h-12 bg-muted rounded-xl"></div>
              <div className="h-20 bg-muted rounded-xl"></div>
            </div>
          )}

          {/* Advanced Filters Skeleton */}
          <div className="mb-8 space-y-4 animate-pulse">
            <div className="flex gap-4">
              <div className="h-12 bg-muted rounded flex-1"></div>
              <div className="h-12 bg-muted rounded w-48"></div>
              <div className="h-12 bg-muted rounded w-32"></div>
            </div>
            <div className="flex gap-2">
              <div className="h-6 bg-muted rounded w-20"></div>
              <div className="h-6 bg-muted rounded w-24"></div>
              <div className="h-6 bg-muted rounded w-28"></div>
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <ProductGridSkeleton count={isMobile ? 8 : 12} />
        </div>
        
        <PageFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-serif text-foreground mb-4">
              Erreur de chargement
            </h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
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
        title="Nos Créations Artisanales - Sacs et Chapeaux Berbères | Rif Raw Straw"
        description="Découvrez notre collection unique d'accessoires berbères, confectionnés à la main par des artisans passionnés des montagnes du Rif."
        keywords={["produits artisanaux", "sacs berbères", "chapeaux paille", "artisanat marocain", "accessoires fait main"]}
        url="/products"
        type="website"
      />
      

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-secondary to-muted py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4 leading-tight">
            Nos Créations Artisanales
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Découvrez notre collection unique d'accessoires berbères, 
            confectionnés à la main par des artisans passionnés.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 safe-area">
        {/* Enhanced Mobile Features */}
        {isMobile && (
          <div className="space-y-6 mb-6">
            {/* Voice Search */}
            <VoiceSearch 
              onSearch={handleVoiceSearch}
              placeholder="Rechercher des produits artisanaux..."
            />
            
            {/* Mobile Promotions with Dynamic Cart Total */}
            <MobilePromotions 
              cartTotal={150} // Pass actual cart total
              onPromotionApply={(code) => toast.success(`Code promo ${code} appliqué!`)}
            />
          </div>
        )}

        {/* Advanced Product Filters */}
        <AdvancedProductFilters
          filters={filters}
          availableOptions={availableOptions}
          searchHistory={searchHistory}
          isLoading={filterLoading}
          totalProducts={totalProductsCount}
          filteredCount={filteredCount}
          activeFiltersCount={activeFiltersCount}
          onFiltersChange={updateFilters}
          onResetFilters={resetFilters}
          onClearFilter={clearFilter}
          getSearchSuggestions={getSearchSuggestions}
          onClearCache={handleClearCache}
          cacheStats={cacheStats}
        />

        {/* Analytics Toggle for Power Users */}
        {!isMobile && activeFiltersCount > 0 && (
          <Collapsible open={showAnalytics} onOpenChange={setShowAnalytics}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="mb-4">
                <BarChart3 className="h-4 w-4 mr-2" />
                {showAnalytics ? 'Masquer' : 'Afficher'} les analyses de recherche
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Analyses de recherche
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductAnalytics cacheStats={cacheStats} />
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Enhanced Search Results Header */}
        <SearchResultsHeader
          searchQuery={filters.searchQuery}
          totalResults={filteredCount}
          showingCount={isMobile ? visibleProducts.length : filteredCount}
        />

        {/* Smart Category Filters with Loading State */}
        {!filters.searchQuery && (
          <div className="flex flex-wrap gap-2 mb-6 md:mb-8 overflow-x-auto mobile-scroll">
            <div className="flex gap-2 min-w-max">
              <Badge
                variant={filters.category.length === 0 ? "default" : "secondary"}
                className={`cursor-pointer px-3 md:px-4 py-2 text-sm touch-manipulation min-h-[44px] flex items-center whitespace-nowrap ${
                  filterLoading ? 'animate-pulse' : ''
                }`}
                onClick={() => updateFilters({ category: [] })}
              >
                Tout voir ({totalProductsCount})
              </Badge>
              {displayCategories.map((category) => {
                const categoryCount = products.filter(p => p.category === category).length;
                return (
                  <Badge
                    key={category}
                    variant={filters.category.includes(category) ? "default" : "secondary"}
                    className={`cursor-pointer px-3 md:px-4 py-2 text-sm touch-manipulation min-h-[44px] flex items-center whitespace-nowrap ${
                      filterLoading ? 'animate-pulse' : ''
                    }`}
                    onClick={() => {
                      if (filters.category.includes(category)) {
                        updateFilters({ category: filters.category.filter(c => c !== category) });
                      } else {
                        updateFilters({ category: [...filters.category, category] });
                      }
                    }}
                  >
                    {category} ({categoryCount})
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Products Grid with Pull to Refresh */}
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-8">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="font-serif text-2xl text-foreground mb-4">
                  Aucun produit trouvé
                </h2>
                <p className="text-muted-foreground mb-6">
                  {filters.searchQuery 
                    ? `Aucun produit ne correspond à "${filters.searchQuery}". Essayez avec d'autres mots-clés.`
                    : "Aucun produit ne correspond à vos critères. Essayez de modifier vos filtres."
                  }
                </p>
                <Button onClick={resetFilters} variant="outline">
                  Effacer tous les filtres
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Skeleton loader during search */}
              {isSearchStale ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Recherche en cours...</span>
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
                        animationFillMode: 'both'
                      }}
                    >
                      <ProductCard
                        product={product}
                        onAddToCart={handleAddToCart}
                        onQuickView={handleQuickView}
                      />
                    </div>
                  ))}
                </div>
              )}

                {/* Infinite Scroll Sentinel and Loading */}
              {isMobile && hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </PullToRefresh>

        {/* CTA Section */}
        {filteredProducts.length > 0 && (
          <div className="text-center py-16 border-t border-border">
            <h2 className="font-serif text-2xl text-foreground mb-4">
              Vous ne trouvez pas ce que vous cherchez ?
            </h2>
            <p className="text-muted-foreground mb-6">
              Contactez-nous pour une création personnalisée selon vos goûts.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/contact" className="inline-flex items-center">
                Nous contacter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Recently Viewed Products */}
        <div className="mt-16">
          <RecentlyViewedProducts onQuickView={setQuickViewProduct} />
        </div>

        {/* General Recommendations */}
        <div className="mt-16">
          <ProductRecommendations
            allProducts={products}
            title="Recommandés pour vous"
            maxRecommendations={8}
            onQuickView={setQuickViewProduct}
          />
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleQuickViewAddToCart}
        />
      )}

      <PageFooter />
      <FloatingCartButton />
    </div>
  );
};

export default Products;