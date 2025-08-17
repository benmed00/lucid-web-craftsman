import { useProductRecommendations } from '@/hooks/useProductRecommendations';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCart } from '@/context/useCart';
import { toast } from 'sonner';
import ProductCard from './ProductCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';

interface ProductRecommendationsProps {
  currentProduct?: Product;
  allProducts: Product[];
  title?: string;
  maxRecommendations?: number;
  onQuickView?: (product: Product) => void;
}

export const ProductRecommendations = ({ 
  currentProduct, 
  allProducts, 
  title = "Recommandés pour vous",
  maxRecommendations = 6,
  onQuickView 
}: ProductRecommendationsProps) => {
  const { recentlyViewed } = useRecentlyViewed();
  const { dispatch } = useCart();

  const recommendations = useProductRecommendations({
    currentProduct,
    allProducts,
    recentlyViewed,
    maxRecommendations,
  });

  const handleAddToCart = async (product: Product) => {
    try {
      const response = await import("@/api/mockApiService").then(api => api.addToCart(product, 1));

      if (response.success) {
        dispatch({
          type: "ADD_ITEM",
          payload: product,
          quantity: 1,
        });
        toast.success(`${product.name} ajouté au panier`);
      } else {
        toast.error("Impossible d'ajouter le produit au panier");
      }
    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast.error("Impossible d'ajouter le produit au panier");
    }
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {recommendations.map((product, index) => (
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
                onQuickView={onQuickView}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};