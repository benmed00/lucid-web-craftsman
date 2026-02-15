import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { fr, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCurrency } from '@/stores/currencyStore';


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
  const { t, i18n } = useTranslation('pages');
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const dateLocale = i18n.language === 'fr' ? fr : enUS;

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

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
      toast.error(t('orders.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { 
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ComponentType<{ className?: string }>;
    }> = {
      pending: { variant: 'outline', icon: Clock },
      paid: { variant: 'default', icon: CheckCircle },
      processing: { variant: 'secondary', icon: Package },
      shipped: { variant: 'default', icon: Truck },
      delivered: { variant: 'default', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: Clock },
      refunded: { variant: 'destructive', icon: Clock }
    };

    const config = statusConfig[status] || { variant: 'outline', icon: Clock };
    const Icon = config.icon;
    const label = t(`orders.status.${status}`, { defaultValue: status });
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const getStatusDescription = (status: string) => {
    return t(`orders.statusDescription.${status}`, { defaultValue: t('orders.statusDescription.pending') });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t('orders.loginRequired.title')}</h1>
            <p className="text-muted-foreground">{t('orders.loginRequired.description')}</p>
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
                {t('orders.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('orders.subtitle')}
              </p>
            </div>
            <Button 
              onClick={fetchOrders} 
              variant="outline" 
              className="gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('orders.refresh')}
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
                  {t('orders.empty.title')}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t('orders.empty.description')}
                </p>
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <a href="/products">{t('orders.empty.cta')}</a>
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
                            {t('orders.orderNumber', { id: order.id.slice(-8) })}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-3">
                          <p>{format(new Date(order.created_at), 'dd MMMM yyyy', { locale: dateLocale })}</p>
                          <p className="mt-1">{getStatusDescription(order.status)}</p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {t('orders.articles', { count: order.order_items.length })}
                          </span>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="font-medium text-foreground">
                            {formatPrice(order.amount / 100)}
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
                            {t('orders.viewDetails')}
                          </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {t('orders.orderNumber', { id: selectedOrder?.id.slice(-8) })}
                              {selectedOrder && getStatusBadge(selectedOrder.status)}
                            </DialogTitle>
                            <DialogDescription>
                              {selectedOrder && format(new Date(selectedOrder.created_at), 'dd MMMM yyyy', { locale: dateLocale })}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedOrder && (
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-medium mb-3 text-foreground">{t('orders.details.orderedItems')}</h4>
                                <div className="space-y-3">
                                  {selectedOrder.order_items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start p-3 bg-muted rounded-lg">
                                      <div className="flex-1">
                                        <div className="font-medium text-foreground">
                                          {item.product_snapshot?.name || t('orders.details.product')}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          {formatPrice(item.unit_price)} × {item.quantity}
                                        </div>
                                        {item.product_snapshot?.description && (
                                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {item.product_snapshot.description}
                                          </div>
                                        )}
                                      </div>
                                      <div className="font-medium text-foreground ml-4">
                                        {formatPrice(item.total_price)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <Separator />

                              <div className="flex justify-between items-center">
                                <span className="text-lg font-medium text-foreground">{t('orders.details.total')}</span>
                                <span className="text-xl font-bold text-foreground">
                                  {formatPrice(selectedOrder.amount / 100)}
                                </span>
                              </div>

                              <div className="bg-primary/10 p-4 rounded-lg">
                                <h4 className="font-medium text-foreground mb-2">{t('orders.details.orderStatus')}</h4>
                                <p className="text-muted-foreground">{getStatusDescription(selectedOrder.status)}</p>
                                
                                {selectedOrder.stripe_session_id && (
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    {t('orders.details.sessionId')}: {selectedOrder.stripe_session_id.slice(-12)}
                                  </div>
                                )}
                              </div>

                              {(selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && (
                                <div className="bg-blue-500/10 p-4 rounded-lg">
                                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    {t('orders.details.deliveryInfo')}
                                  </h4>
                                  <p className="text-blue-600 dark:text-blue-400">
                                    {selectedOrder.status === 'delivered' 
                                      ? t('orders.details.deliveredMessage') 
                                      : t('orders.details.inTransitMessage')}
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