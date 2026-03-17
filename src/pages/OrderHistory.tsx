import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import PageFooter from '@/components/PageFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Package,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  MapPin,
  ExternalLink,
  CircleDot,
  CreditCard,
} from 'lucide-react';
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

interface StatusHistoryEntry {
  id: string;
  new_status: string;
  previous_status: string | null;
  created_at: string;
  reason_message: string | null;
  changed_by: string;
}

interface Order {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  shipping_address: any;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  order_status_history: StatusHistoryEntry[];
}

const OrderHistory = () => {
  const { t, i18n } = useTranslation('pages');
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
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
        .select(
          `
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot
          ),
          order_status_history (
            id,
            new_status,
            previous_status,
            created_at,
            reason_message,
            changed_by
          )
        `
        )
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
    if (!authLoading) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        icon: React.ComponentType<{ className?: string }>;
      }
    > = {
      pending: { variant: 'outline', icon: Clock },
      paid: { variant: 'default', icon: CheckCircle },
      processing: { variant: 'secondary', icon: Package },
      shipped: { variant: 'default', icon: Truck },
      delivered: { variant: 'default', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: Clock },
      refunded: { variant: 'destructive', icon: Clock },
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
    return t(`orders.statusDescription.${status}`, {
      defaultValue: t('orders.statusDescription.pending'),
    });
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-3">
              {t('orders.loginRequired.title')}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('orders.loginRequired.description')}
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Se connecter
            </Button>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                {t('orders.title')}
              </h1>
              <p className="text-muted-foreground">{t('orders.subtitle')}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/profile#orders')}
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Mon profil
              </Button>
              <Button
                onClick={fetchOrders}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                {t('orders.refresh')}
              </Button>
            </div>
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
                <Card
                  key={order.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">
                            {t('orders.orderNumber', {
                              id: order.id.slice(-8),
                            })}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="text-sm text-muted-foreground mb-3">
                          <p>
                            {format(
                              new Date(order.created_at),
                              'dd MMMM yyyy',
                              { locale: dateLocale }
                            )}
                          </p>
                          <p className="mt-1">
                            {getStatusDescription(order.status)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {t('orders.articles', {
                              count: order.order_items.length,
                            })}
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
                              {t('orders.orderNumber', {
                                id: selectedOrder?.id.slice(-8),
                              })}
                              {selectedOrder &&
                                getStatusBadge(selectedOrder.status)}
                            </DialogTitle>
                            <DialogDescription>
                              {selectedOrder &&
                                format(
                                  new Date(selectedOrder.created_at),
                                  'dd MMMM yyyy',
                                  { locale: dateLocale }
                                )}
                            </DialogDescription>
                          </DialogHeader>

                          {selectedOrder && (
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                              {/* Tracking info */}
                              {selectedOrder.tracking_number && (
                                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                  <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <div className="text-sm flex-1">
                                    <p className="font-medium text-foreground">
                                      Suivi de livraison
                                    </p>
                                    <p className="text-muted-foreground">
                                      {selectedOrder.carrier &&
                                        `${selectedOrder.carrier} — `}
                                      N° {selectedOrder.tracking_number}
                                    </p>
                                    {selectedOrder.estimated_delivery && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Livraison prévue :{' '}
                                        {format(
                                          new Date(
                                            selectedOrder.estimated_delivery
                                          ),
                                          'dd MMMM yyyy',
                                          { locale: dateLocale }
                                        )}
                                      </p>
                                    )}
                                    {selectedOrder.actual_delivery && (
                                      <p className="text-xs text-green-600 mt-1">
                                        ✓ Livré le{' '}
                                        {format(
                                          new Date(
                                            selectedOrder.actual_delivery
                                          ),
                                          'dd MMMM yyyy',
                                          { locale: dateLocale }
                                        )}
                                      </p>
                                    )}
                                    {selectedOrder.tracking_url && (
                                      <a
                                        href={selectedOrder.tracking_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                                      >
                                        Suivre mon colis{' '}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Shipping address */}
                              {selectedOrder.shipping_address &&
                                (() => {
                                  const addr = selectedOrder.shipping_address;
                                  const line1 =
                                    addr.address_line1 ||
                                    addr.address ||
                                    addr.line1 ||
                                    '';
                                  const city = addr.city || '';
                                  if (!line1 && !city) return null;
                                  return (
                                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <div className="text-sm">
                                        <p className="font-medium text-foreground mb-0.5">
                                          Adresse de livraison
                                        </p>
                                        {(addr.name || addr.full_name) && (
                                          <p className="text-muted-foreground">
                                            {addr.name || addr.full_name}
                                          </p>
                                        )}
                                        <p className="text-muted-foreground">
                                          {line1}
                                        </p>
                                        {(addr.address_line2 || addr.line2) && (
                                          <p className="text-muted-foreground">
                                            {addr.address_line2 || addr.line2}
                                          </p>
                                        )}
                                        <p className="text-muted-foreground">
                                          {addr.postal_code || addr.zip || ''}{' '}
                                          {city}
                                          {addr.country
                                            ? `, ${addr.country}`
                                            : ''}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}

                              {/* Order items */}
                              <div>
                                <h4 className="font-medium mb-3 text-foreground">
                                  {t('orders.details.orderedItems')}
                                </h4>
                                <div className="space-y-3">
                                  {selectedOrder.order_items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex justify-between items-start p-3 bg-muted rounded-lg"
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium text-foreground">
                                          {item.product_snapshot?.name ||
                                            t('orders.details.product')}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                          {formatPrice(item.unit_price)} ×{' '}
                                          {item.quantity}
                                        </div>
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
                                <span className="text-lg font-medium text-foreground">
                                  {t('orders.details.total')}
                                </span>
                                <span className="text-xl font-bold text-foreground">
                                  {formatPrice(selectedOrder.amount / 100)}
                                </span>
                              </div>

                              {/* Payment method */}
                              {selectedOrder.payment_method && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CreditCard className="h-3 w-3" />
                                  Paiement par{' '}
                                  {selectedOrder.payment_method === 'card'
                                    ? 'carte bancaire'
                                    : selectedOrder.payment_method}
                                </div>
                              )}

                              {/* Order Timeline */}
                              {selectedOrder.order_status_history?.length >
                                0 && (
                                <div>
                                  <h4 className="font-medium text-foreground mb-3">
                                    Chronologie
                                  </h4>
                                  <div className="relative pl-6 space-y-4">
                                    <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
                                    {[...selectedOrder.order_status_history]
                                      .sort(
                                        (a, b) =>
                                          new Date(b.created_at).getTime() -
                                          new Date(a.created_at).getTime()
                                      )
                                      .map((entry, idx) => {
                                        const isLatest = idx === 0;
                                        const statusLabels: Record<
                                          string,
                                          string
                                        > = {
                                          created: 'Créée',
                                          payment_pending:
                                            'Paiement en attente',
                                          paid: 'Payée',
                                          preparing: 'En préparation',
                                          shipped: 'Expédiée',
                                          in_transit: 'En transit',
                                          delivered: 'Livrée',
                                          cancelled: 'Annulée',
                                          refunded: 'Remboursée',
                                          validated: 'Validée',
                                          payment_failed: 'Paiement échoué',
                                        };
                                        return (
                                          <div
                                            key={entry.id}
                                            className="relative flex items-start gap-3"
                                          >
                                            <div
                                              className={`absolute left-[-15px] top-1 h-[18px] w-[18px] rounded-full flex items-center justify-center ${isLatest ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'}`}
                                            >
                                              <CircleDot className="h-3 w-3" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p
                                                className={`text-sm font-medium ${isLatest ? 'text-foreground' : 'text-muted-foreground'}`}
                                              >
                                                {statusLabels[
                                                  entry.new_status
                                                ] || entry.new_status}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {format(
                                                  new Date(entry.created_at),
                                                  "dd MMM yyyy 'à' HH:mm",
                                                  { locale: dateLocale }
                                                )}
                                              </p>
                                              {entry.reason_message && (
                                                <p className="text-xs text-muted-foreground mt-0.5 italic">
                                                  {entry.reason_message}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {selectedOrder.stripe_session_id && (
                                <div className="text-xs text-muted-foreground">
                                  {t('orders.details.sessionId')}:{' '}
                                  {selectedOrder.stripe_session_id.slice(-12)}
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
