import { useState, useEffect } from 'react';
import { Clock, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { useCart } from '@/stores';
import { useCurrency } from '@/stores/currencyStore';

interface QuickReorderProps {
  userId?: string;
}

interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  orderDate: string;
  orderId: string;
}

export const QuickReorder = ({ userId }: QuickReorderProps) => {
  const [recentItems, setRecentItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    loadRecentOrders();
  }, [userId]);

  const loadRecentOrders = async () => {
    try {
      // In a real app, fetch from your API
      const mockRecentItems: OrderItem[] = [
        {
          id: '1',
          product: {
            id: 1,
            name: 'Sac traditionnel berbère',
            price: 45,
            images: ['/assets/images/sacs/sac_traditionnel.jpg'],
            category: 'Sacs',
            description: 'Sac artisanal en fibres naturelles',
            artisan: 'Fatima Alaoui',
            details: 'Dimensions: 30x25x10cm',
            care: 'Nettoyage à la main'
          },
          quantity: 1,
          orderDate: '2024-01-15',
          orderId: 'ORD-001'
        },
        {
          id: '2',
          product: {
            id: 2,
            name: 'Chapeau de paille berbère',
            price: 35,
            images: ['/assets/images/products/chapeau_de_paille_berbere.jpg'],
            category: 'Chapeaux',
            description: 'Chapeau traditionnel en paille tressée',
            artisan: 'Ahmed Benaissa',
            details: 'Taille unique ajustable',
            care: 'Éviter l\'humidité'
          },
          quantity: 2,
          orderDate: '2024-01-10',
          orderId: 'ORD-002'
        }
      ];

      // Simulate API delay
      setTimeout(() => {
        setRecentItems(mockRecentItems);
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error loading recent orders:', error);
      setIsLoading(false);
    }
  };

  const handleQuickReorder = async (item: OrderItem) => {
    try {
      addItem(item.product, item.quantity);

      toast({
        title: "Ajouté au panier",
        description: `${item.quantity}x ${item.product.name}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit au panier",
        variant: "destructive"
      });
    }
  };

  const handleReorderAll = async () => {
    try {
      for (const item of recentItems) {
        addItem(item.product, item.quantity);
      }

      toast({
        title: "Commandes ajoutées",
        description: `${recentItems.length} produits ajoutés au panier`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les produits au panier",
        variant: "destructive"
      });
    }
  };

  if (!userId) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-olive-600" />
            Commande rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-600 text-center py-4">
            Connectez-vous pour voir vos commandes récentes et recommander facilement.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-olive-600" />
            Recommander rapidement
          </CardTitle>
          
          {recentItems.length > 1 && (
            <Button
              size="sm"
              onClick={handleReorderAll}
              className="bg-olive-700 hover:bg-olive-800 text-xs px-3 py-2 h-8"
            >
              Tout recommander
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg animate-pulse">
                <div className="w-12 h-12 bg-stone-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-32"></div>
                  <div className="h-3 bg-stone-200 rounded w-24"></div>
                </div>
                <div className="w-20 h-8 bg-stone-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600">Aucune commande récente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-stone-800 text-sm truncate">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-olive-600 font-medium text-sm">
                      {formatPrice(item.product.price)}
                    </span>
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      Qté: {item.quantity}
                    </Badge>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleQuickReorder(item)}
                  className="bg-olive-700 hover:bg-olive-800 text-white px-3 py-2 h-8 text-xs touch-manipulation"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Ajouter
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};