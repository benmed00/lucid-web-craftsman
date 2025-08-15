import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import PageFooter from "@/components/PageFooter";
import ProductCard from "@/components/ProductCard";
import { ProductQuickView } from "@/components/ProductQuickView";
import { ProductFilters } from "@/components/ProductFilters";
import { SearchResultsHeader, HighlightText } from "@/components/SearchResults";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { getProducts } from "@/api/mockApiService";
import { useCart } from "@/context/useCart";
import { useProductFilters } from "@/hooks/useProductFilters";
import { Product } from "@/shared/interfaces/Iproduct.interface";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  
  const { dispatch } = useCart();

  // Initialize filters hook
  const {
    filters,
    filteredProducts,
    availableCategories,
    priceRange,
    updateFilters,
    resetFilters,
    clearFilter,
    activeFiltersCount,
    totalProducts,
    filteredCount
  } = useProductFilters({ products });

  useEffect(() => {
    window.scrollTo(0, 0);
    
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
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

  // Memoized categories for filter badges
  const displayCategories = useMemo(() => availableCategories, [availableCategories]);

  const handleAddToCart = (product: Product, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    dispatch({
      type: "ADD_ITEM",
      payload: product,
      quantity: 1,
    });

    toast.success(`${product.name} ajouté au panier`, {
      duration: 2000,
    });
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const handleQuickViewAddToCart = (product: Product, quantity: number) => {
    dispatch({
      type: "ADD_ITEM",
      payload: product,
      quantity: quantity,
    });

    toast.success(`${product.name} ajouté au panier (${quantity}x)`, {
      duration: 2000,
    });

    setQuickViewProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section Skeleton */}
          <div className="mb-16">
            <div className="h-8 bg-stone-200 rounded w-64 mb-4 mx-auto animate-pulse"></div>
            <div className="h-6 bg-stone-200 rounded w-96 mx-auto animate-pulse"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-4">
              <div className="h-10 bg-stone-200 rounded flex-1 animate-pulse"></div>
              <div className="h-10 bg-stone-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-stone-200 rounded w-24 animate-pulse"></div>
            </div>
            <div className="h-4 bg-stone-200 rounded w-48 animate-pulse"></div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-stone-200 aspect-square rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-16"></div>
                  <div className="h-5 bg-stone-200 rounded w-32"></div>
                  <div className="h-4 bg-stone-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-serif text-stone-800 mb-4">
              Erreur de chargement
            </h1>
            <p className="text-stone-600 mb-8">{error}</p>
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
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-olive-50 to-stone-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-serif text-4xl md:text-5xl text-stone-800 mb-4">
            Nos Créations Artisanales
          </h1>
          <p className="text-lg text-stone-600 max-w-2xl mx-auto">
            Découvrez notre collection unique d'accessoires berbères, 
            confectionnés à la main par des artisans passionnés.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Product Filters */}
        <ProductFilters
          filters={filters}
          availableCategories={availableCategories}
          priceRange={priceRange}
          totalProducts={totalProducts}
          filteredCount={filteredCount}
          activeFiltersCount={activeFiltersCount}
          onFiltersChange={updateFilters}
          onResetFilters={resetFilters}
          onClearFilter={clearFilter}
        />

        {/* Search Results Header */}
        <SearchResultsHeader
          searchQuery={filters.searchQuery}
          totalResults={filteredCount}
          showingCount={filteredCount}
        />

        {/* Category Quick Filters */}
        {!filters.searchQuery && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Badge
              variant={filters.category.length === 0 ? "default" : "secondary"}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => updateFilters({ category: [] })}
            >
              Tout voir
            </Badge>
            {displayCategories.map((category) => (
              <Badge
                key={category}
                variant={filters.category.includes(category) ? "default" : "secondary"}
                className="cursor-pointer px-4 py-2 text-sm"
                onClick={() => {
                  if (filters.category.includes(category)) {
                    updateFilters({ category: filters.category.filter(c => c !== category) });
                  } else {
                    updateFilters({ category: [...filters.category, category] });
                  }
                }}
              >
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-8">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="font-serif text-2xl text-stone-800 mb-4">
                Aucun produit trouvé
              </h2>
              <p className="text-stone-600 mb-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id}
                className="animate-fade-in"
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

        {/* CTA Section */}
        {filteredProducts.length > 0 && (
          <div className="text-center py-16 border-t border-stone-200">
            <h2 className="font-serif text-2xl text-stone-800 mb-4">
              Vous ne trouvez pas ce que vous cherchez ?
            </h2>
            <p className="text-stone-600 mb-6">
              Contactez-nous pour une création personnalisée selon vos goûts.
            </p>
            <Button asChild className="bg-olive-700 hover:bg-olive-800">
              <Link to="/contact" className="inline-flex items-center">
                Nous contacter
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
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
    </div>
  );
};

export default Products;