import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, Calendar, CreditCard, Truck, Eye } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
  stripe_session_id: string | null;
  shipments: Shipment[];
}

interface Shipment {
  id: string;
  order_id: string;
  status: string | null;
  carrier: string | null;
  tracking_number: string | null;
  expected_delivery: string | null;
  created_at: string;
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
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map orders without shipments join (no FK relationship)
      setOrders((data || []).map(order => ({ ...order, shipments: [] })));
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusMap = {
      'pending': { label: 'En attente', variant: 'secondary' as const },
      'processing': { label: 'En cours', variant: 'default' as const },
      'shipped': { label: 'Expédiée', variant: 'outline' as const },
      'delivered': { label: 'Livrée', variant: 'default' as const },
      'cancelled': { label: 'Annulée', variant: 'destructive' as const },
      'refunded': { label: 'Remboursée', variant: 'secondary' as const }
    };

    const config = statusMap[status as keyof typeof statusMap] || { 
      label: status || 'Inconnu', 
      variant: 'secondary' as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getShipmentStatusBadge = (status: string | null) => {
    const statusMap = {
      'pending': { label: 'Préparation', variant: 'secondary' as const },
      'shipped': { label: 'Expédiée', variant: 'default' as const },
      'in_transit': { label: 'En transit', variant: 'outline' as const },
      'delivered': { label: 'Livrée', variant: 'default' as const },
      'exception': { label: 'Problème', variant: 'destructive' as const }
    };

    const config = statusMap[status as keyof typeof statusMap] || { 
      label: status || 'Inconnu', 
      variant: 'secondary' as const 
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
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
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </div>
                        {order.amount && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {formatPrice(order.amount)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Détails
                    </Button>
                  </div>

                  {/* Shipment Information */}
                  {order.shipments && order.shipments.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <h5 className="font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Livraison
                      </h5>
                      {order.shipments.map((shipment) => (
                        <div key={shipment.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getShipmentStatusBadge(shipment.status)}
                              {shipment.carrier && (
                                <span className="text-sm text-muted-foreground">
                                  via {shipment.carrier}
                                </span>
                              )}
                            </div>
                            {shipment.tracking_number && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Suivi: </span>
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {shipment.tracking_number}
                                </code>
                              </div>
                            )}
                          </div>
                          
                          {shipment.expected_delivery && (
                            <div className="text-sm text-muted-foreground">
                              Livraison prévue: {format(new Date(shipment.expected_delivery), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Actions */}
                  <div className="flex gap-2">
                    {order.status === 'delivered' && (
                      <Button variant="outline" size="sm">
                        Laisser un avis
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button variant="outline" size="sm">
                        Annuler la commande
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      Contacter le support
                    </Button>
                  </div>
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