import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Calendar,
  CreditCard,
  Truck,
  Eye,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '@/lib/stripe';

interface Order {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  order_status: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    product_snapshot: any;
  }>;
}

interface OrderHistoryProps {
  user: User;
}

export function OrderHistory({ user }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [user.id]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          id, amount, currency, status, order_status, created_at, updated_at,
          tracking_number, carrier, estimated_delivery,
          order_items (id, quantity, product_snapshot)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (order: Order) => {
    const status = order.order_status || order.status || 'pending';
    const statusMap: Record<
      string,
      {
        label: string;
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        icon: typeof Clock;
      }
    > = {
      created: { label: 'Créée', variant: 'outline', icon: Clock },
      payment_pending: { label: 'En attente', variant: 'outline', icon: Clock },
      pending: { label: 'En attente', variant: 'outline', icon: Clock },
      paid: { label: 'Payée', variant: 'default', icon: CheckCircle },
      processing: { label: 'En cours', variant: 'secondary', icon: Package },
      preparing: { label: 'Préparation', variant: 'secondary', icon: Package },
      shipped: { label: 'Expédiée', variant: 'default', icon: Truck },
      in_transit: { label: 'En transit', variant: 'default', icon: Truck },
      delivered: { label: 'Livrée', variant: 'default', icon: CheckCircle },
      cancelled: { label: 'Annulée', variant: 'destructive', icon: Clock },
      refunded: { label: 'Remboursée', variant: 'destructive', icon: Clock },
    };

    const config = statusMap[status] || {
      label: status,
      variant: 'secondary' as const,
      icon: Clock,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune commande</h3>
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas encore passé de commande.
            </p>
            <Button asChild>
              <a href="/products">Découvrir nos produits</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historique des commandes ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {orders.map((order, index) => (
              <div key={order.id}>
                <div className="space-y-4">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">
                          Commande #{order.id.slice(-8)}
                        </h4>
                        {getStatusBadge(order)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.created_at), 'dd MMMM yyyy', {
                            locale: fr,
                          })}
                        </div>
                        {order.amount && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {formatPrice(order.amount / 100)}
                          </div>
                        )}
                      </div>
                      {order.order_items?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.order_items.length} article
                          {order.order_items.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <a href={`/orders`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Détails
                      </a>
                    </Button>
                  </div>

                  {/* Tracking Information */}
                  {order.tracking_number && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <h5 className="font-medium flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4" />
                        Suivi de livraison
                      </h5>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {order.carrier && `${order.carrier} — `}N°{' '}
                          {order.tracking_number}
                        </span>
                      </div>
                      {order.estimated_delivery && (
                        <p className="text-xs text-muted-foreground">
                          Livraison prévue :{' '}
                          {format(
                            new Date(order.estimated_delivery),
                            'dd MMMM yyyy',
                            { locale: fr }
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {index < orders.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
