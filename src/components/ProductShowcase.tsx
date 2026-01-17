import { useCart } from "@/stores";
import { toast } from "sonner";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { useMemo, useState, useCallback, useEffect } from "react";
import ProductCard, { StockContext } from "./ProductCard";
import { ProductQuickView } from "./ProductQuickView";
import { Card, CardContent } from "@/components/ui/card";
import { useStock } from "@/hooks/useStock";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useProductsWithTranslations, ProductWithTranslation } from "@/hooks/useTranslatedContent";

const ProductShowcase = () => {
  const { t } = useTranslation('products');
  const { addItem } = useCart();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch products with translations
  const { data: translatedProducts = [], isLoading: loading } = useProductsWithTranslations();

  // Transform to Product interface and get featured products
  const featuredProducts = useMemo(() => {
    return translatedProducts.slice(0, 4).map((p: ProductWithTranslation): Product => ({
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
    }));
  }, [translatedProducts]);

  // Batch stock loading for all featured products
  const productIds = featuredProducts.map(p => p.id);
  const { stockInfo } = useStock({ 
    productIds, 
    enabled: productIds.length > 0 
  });

  // Handle URL-based quick view state
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && featuredProducts.length > 0) {
      const productIdNum = parseInt(productId, 10);
      const product = featuredProducts.find(p => p.id === productIdNum);
      if (product) {
        setQuickViewProduct(product);
      } else {
        // Try to find in all translated products
        const allProducts = translatedProducts.map((p: ProductWithTranslation): Product => ({
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
        }));
        const foundProduct = allProducts.find(p => p.id === productIdNum);
        if (foundProduct) {
          setQuickViewProduct(foundProduct);
        }
      }
    } else {
      setQuickViewProduct(null);
    }
  }, [searchParams, featuredProducts, translatedProducts]);

  const handleAddToCart = async (product: Product) => { // Made async
    try {
      // Call mock API service first
      const response = await import("@/api/mockApiService").then(api => api.addToCart(product, 1));

      if (response.success) {
        // Use direct action instead of dispatch
        addItem(product, 1);
        toast.success(t('recommendations.addedToCart', { name: product.name }));
      } else {
        toast.error(t('recommendations.addError'));
      }
    } catch (error) {
      // Silent error handling for production
      toast.error(t('recommendations.addError'));
    }

  };

  const handleQuickView = useCallback((product: Product) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('product', product.id.toString());
    setSearchParams(newSearchParams, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleCloseQuickView = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('product');
    setSearchParams(newSearchParams, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleQuickViewAddToCart = async (product: Product, quantity: number) => {
    try {
      // Call mock API service first
      const response = await import("@/api/mockApiService").then(api => api.addToCart(product, quantity));

      if (response.success) {
        // Use direct action instead of dispatch
        addItem(product, quantity);
      } else {
        toast.error(t('recommendations.addError'));
      }
    } catch (error) {
      // Silent error handling for production
      toast.error(t('recommendations.addError'));
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-fade-in opacity-0"
            style={{ 
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'forwards'
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

  return (
    <StockContext.Provider value={stockInfo || {}}>
      <section 
        className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6"
        aria-label={t('showcase.ariaLabel')}
        role="region"
      >
        {featuredProducts.map((product, index) => (
          <article 
            key={product.id}
            className="animate-fade-in opacity-0"
            style={{ 
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'forwards'
            }}
            aria-labelledby={`product-${product.id}-name`}
          >
            <ProductCard
              product={product}
              onAddToCart={handleAddToCart}
              onQuickView={handleQuickView}
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
