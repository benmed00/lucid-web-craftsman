import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import PageFooter from '@/components/PageFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Eye, Truck, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: any;
}

interface Order {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders((data as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { 
      label: string; 
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ComponentType<{ className?: string }>;
    }> = {
      pending: { label: 'En attente', variant: 'outline', icon: Clock },
      paid: { label: 'Payée', variant: 'default', icon: CheckCircle },
      processing: { label: 'En préparation', variant: 'secondary', icon: Package },
      shipped: { label: 'Expédiée', variant: 'default', icon: Truck },
      delivered: { label: 'Livrée', variant: 'default', icon: CheckCircle },
      cancelled: { label: 'Annulée', variant: 'destructive', icon: Clock },
      refunded: { label: 'Remboursée', variant: 'destructive', icon: Clock }
    };

    const config = statusConfig[status] || { label: status, variant: 'outline', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusDescription = (status: string) => {
    const descriptions: Record<string, string> = {
      pending: 'Votre commande est en attente de traitement.',
      paid: 'Votre paiement a été confirmé.',
      processing: 'Votre commande est en cours de préparation par nos artisans.',
      shipped: 'Votre commande a été expédiée et est en route.',
      delivered: 'Votre commande a été livrée avec succès.',
      cancelled: 'Votre commande a été annulée.',
      refunded: 'Votre commande a été remboursée.'
    };

    return descriptions[status] || 'Statut de commande non reconnu.';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Connectez-vous pour voir vos commandes</h1>
            <p className="text-muted-foreground">Vous devez être connecté pour accéder à l'historique de vos commandes.</p>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                Mes Commandes
              </h1>
              <p className="text-muted-foreground">
                Suivez l'état de vos commandes et consultez votre historique d'achats
              </p>
            </div>
            <Button 
              onClick={fetchOrders} 
              variant="outline" 
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucune commande trouvée
                </h3>
                <p className="text-muted-foreground mb-6">
                  Vous n'avez pas encore passé de commande. Découvrez notre collection artisanale !
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <a href="/products">Découvrir nos produits</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">
                            Commande #{order.id.slice(-8)}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3">
                          <p>Passée le {format(new Date(order.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                          <p className="mt-1">{getStatusDescription(order.status)}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {order.order_items.length} article{order.order_items.length > 1 ? 's' : ''}
                          </span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="font-medium text-foreground">
                            {(order.amount / 100).toFixed(2)} €
                          </span>
                        </div>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Voir détails
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              Commande #{selectedOrder?.id.slice(-8)}
                              {selectedOrder && getStatusBadge(selectedOrder.status)}
                            </DialogTitle>
                            <DialogDescription>
                              {selectedOrder && format(new Date(selectedOrder.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedOrder && (
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-medium mb-3 text-foreground">Articles commandés</h4>
                                <div className="space-y-3">
                                  {selectedOrder.order_items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                                      <div className="flex-1">
                                        <div className="font-medium text-foreground">
                                          {item.product_snapshot?.name || 'Produit'}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          {item.unit_price.toFixed(2)} € × {item.quantity}
                                        </div>
                                        {item.product_snapshot?.description && (
                                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {item.product_snapshot.description}
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-medium text-foreground ml-4">
                                        {item.total_price.toFixed(2)} €
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Separator />

                              <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-foreground">Total</span>
                                <span className="text-xl font-bold text-foreground">
                                  {(selectedOrder.amount / 100).toFixed(2)} €
                                </span>
                              </div>

                              <div className="bg-primary/10 p-4 rounded-lg">
                                <h4 className="font-medium text-foreground mb-2">État de la commande</h4>
                                <p className="text-muted-foreground">{getStatusDescription(selectedOrder.status)}</p>
                                
                                {selectedOrder.stripe_session_id && (
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    ID de session: {selectedOrder.stripe_session_id.slice(-12)}
                                  </div>
                                )}
                              </div>

                              {(selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && (
                                <div className="bg-blue-500/10 p-4 rounded-lg">
                                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Information de livraison
                                  </h4>
                                  <p className="text-blue-600 dark:text-blue-400">
                                    {selectedOrder.status === 'delivered' 
                                      ? 'Votre commande a été livrée avec succès.' 
                                      : 'Votre commande est en cours de livraison.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default OrderHistory;