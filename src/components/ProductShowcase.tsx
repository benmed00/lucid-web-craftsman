
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { useEffect, useState } from "react";
import { ProductService } from "@/services/productService";
import ProductCard, { StockContext } from "./ProductCard";
import { ProductQuickView } from "./ProductQuickView";
import { Card, CardContent } from "@/components/ui/card";
import { useStock } from "@/hooks/useStock";
import { StockInfo } from "@/services/stockService";

const ProductShowcase = () => {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  // Batch stock loading for all featured products
  const productIds = featuredProducts.map(p => p.id);
  const { stockInfo } = useStock({ 
    productIds, 
    enabled: productIds.length > 0 
  });

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const allProducts = await ProductService.getAllProducts();
        setFeaturedProducts(allProducts.slice(0, 4));

        setLoading(false);
      } catch (error) {
        // Silent error handling for production
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  const handleAddToCart = async (product: Product) => { // Made async
    try {
      // Call mock API service first
      const response = await import("@/api/mockApiService").then(api => api.addToCart(product, 1));

      if (response.success) {
        // Then dispatch action to update context state
        dispatch({
          type: "ADD_ITEM",
          payload: product,
          quantity: 1,
        });
        toast.success(`${product.name} ajouté au panier`);
      } else {
        toast.error("Impossible d'ajouter le produit au panier (API error)");
      }
    } catch (error) {
      // Silent error handling for production
      toast.error("Impossible d'ajouter le produit au panier");
    }

  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleQuickViewAddToCart = async (product: Product, quantity: number) => {
    try {
      // Call mock API service first
      const response = await import("@/api/mockApiService").then(api => api.addToCart(product, quantity));

      if (response.success) {
        // Then dispatch action to update context state
        for (let i = 0; i < quantity; i++) {
          dispatch({
            type: "ADD_ITEM",
            payload: product,
            quantity: 1,
          });
        }
      } else {
        toast.error("Impossible d'ajouter le produit au panier (API error)");
      }
    } catch (error) {
      // Silent error handling for production
      toast.error("Impossible d'ajouter le produit au panier");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-fade-in opacity-0"
            style={{ 
              animationDelay: `${i * 100}ms`,
              animationFillMode: 'forwards'
            }}
          >
            <Card className="bg-white border-none overflow-hidden animate-pulse rounded-xl shadow-md">
              <div className="aspect-[4/3] w-full bg-gradient-to-br from-gray-200 to-gray-100 rounded-t-xl"></div>
              <CardContent className="p-5 space-y-4">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-2/3"></div>
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-4/5"></div>
                <div className="space-y-3">
                  <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-1/2"></div>
                  <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-full"></div>
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        aria-label="Produits en vedette"
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
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewProduct(null);
        }}
        onAddToCart={handleQuickViewAddToCart}
      />
    </StockContext.Provider>
  );
};

export default ProductShowcase;
