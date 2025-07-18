
import { useCart } from "@/context/useCart";
import { toast } from "sonner";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { useEffect, useState } from "react";
import { getProducts } from "@/api/mockApiService";
import ProductCard from "./ProductCard"; // Import the new ProductCard component
import { Card, CardContent } from "@/components/ui/card"; // Keep for skeleton

const ProductShowcase = () => {
  const { dispatch } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          // Using Card and CardContent for skeleton structure
          <Card key={i} className="bg-white border-none overflow-hidden animate-pulse">
            <div className="aspect-w-1 aspect-h-1 w-full bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div> {/* Category placeholder */}
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div> {/* Name placeholder */}
              <div className="flex justify-between items-center mt-2">
                <div className="h-5 bg-gray-200 rounded w-1/4"></div> {/* Price placeholder */}
                <div className="h-8 bg-gray-200 rounded w-1/3"></div> {/* Button placeholder */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {featuredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
};

export default ProductShowcase;
