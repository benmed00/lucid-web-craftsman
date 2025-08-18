import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import ProductCard from './ProductCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, X } from 'lucide-react';
import { Product } from '@/shared/interfaces/Iproduct.interface';

interface RecentlyViewedProductsProps {
  onQuickView?: (product: Product) => void;
}

export const RecentlyViewedProducts = ({ onQuickView }: RecentlyViewedProductsProps) => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const { dispatch } = useCart();

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

  if (recentlyViewed.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Récemment consultés
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRecentlyViewed}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {recentlyViewed.slice(0, 4).map((product) => (
            <div key={product.id} className="transform scale-95">
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