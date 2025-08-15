
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { useEffect, useState } from "react";
import { getProducts } from "@/api/mockApiService";
import ProductCard from "./ProductCard";
import { ProductQuickView } from "./ProductQuickView";
import { Card, CardContent } from "@/components/ui/card";


const ProductShowcase = () => {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      try {
        const allProducts = await getProducts();
        setFeaturedProducts(allProducts.slice(0, 4));

        setLoading(false);
      } catch (error) {
        console.error("Error loading featured products:", error);
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
      console.error("Error adding product to cart:", error);
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
      console.error("Error adding product to cart:", error);
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
            <Card className="bg-white border-none overflow-hidden animate-pulse">
              <div className="aspect-square w-full bg-gradient-to-br from-gray-200 to-gray-100 rounded-t-lg"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-2/3"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-4/5"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-100 rounded w-1/3"></div>
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-20"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {featuredProducts.map((product, index) => (
          <div 
            key={product.id}
            className="animate-fade-in opacity-0"
            style={{ 
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'forwards'
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
      
      <ProductQuickView
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setQuickViewProduct(null);
        }}
        onAddToCart={handleQuickViewAddToCart}
      />
    </>
  );
};

export default ProductShowcase;
