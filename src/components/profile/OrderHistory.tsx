import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Package,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  ChevronDown,
  ExternalLink,
  CircleDot,
} from 'lucide-react';
import { fetchCustomerOrdersDetailed } from '@/services/orderService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '@/lib/stripe';
import { useQuery } from '@tanstack/react-query';

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
  amount: number | null;
  currency: string | null;
  status: string | null;
  order_status: string | null;
  created_at: string;
  updated_at: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  shipping_address: any;
  payment_method: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_snapshot: any;
  }>;
  order_status_history: StatusHistoryEntry[];
}

interface OrderHistoryProps {
  user: User;
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Créée',
  payment_pending: 'Paiement en attente',
  payment_failed: 'Paiement échoué',
  paid: 'Payée',
  validation_in_progress: 'Validation en cours',
  validated: 'Validée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  in_transit: 'En transit',
  delivered: 'Livrée',
  delivery_failed: 'Échec de livraison',
  return_requested: 'Retour demandé',
  returned: 'Retournée',
  refunded: 'Remboursée',
  partially_refunded: 'Partiellement remboursée',
  cancelled: 'Annulée',
  archived: 'Archivée',
  pending: 'En attente',
  processing: 'En cours',
};

async function fetchOrders(userId: string): Promise<Order[]> {
  const rows = await fetchCustomerOrdersDetailed(userId);
  return (rows as Order[]) || [];
}

function getStatusConfig(status: string) {
  const statusMap: Record<
    string,
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: typeof Clock;
      color: string;
    }
  > = {
    created: {
      label: 'Créée',
      variant: 'outline',
      icon: Clock,
      color: 'text-muted-foreground',
    },
    payment_pending: {
      label: 'En attente',
      variant: 'outline',
      icon: Clock,
      color: 'text-muted-foreground',
    },
    pending: {
      label: 'En attente',
      variant: 'outline',
      icon: Clock,
      color: 'text-muted-foreground',
    },
    paid: {
      label: 'Payée',
      variant: 'default',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    validated: {
      label: 'Validée',
      variant: 'default',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    preparing: {
      label: 'Préparation',
      variant: 'secondary',
      icon: Package,
      color: 'text-blue-500',
    },
    processing: {
      label: 'En cours',
      variant: 'secondary',
      icon: Package,
      color: 'text-blue-500',
    },
    shipped: {
      label: 'Expédiée',
      variant: 'default',
      icon: Truck,
      color: 'text-blue-500',
    },
    in_transit: {
      label: 'En transit',
      variant: 'default',
      icon: Truck,
      color: 'text-blue-500',
    },
    delivered: {
      label: 'Livrée',
      variant: 'default',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    cancelled: {
      label: 'Annulée',
      variant: 'destructive',
      icon: Clock,
      color: 'text-destructive',
    },
    refunded: {
      label: 'Remboursée',
      variant: 'destructive',
      icon: Clock,
      color: 'text-destructive',
    },
    payment_failed: {
      label: 'Paiement échoué',
      variant: 'destructive',
      icon: Clock,
      color: 'text-destructive',
    },
  };

  return (
    statusMap[status] || {
      label: STATUS_LABELS[status] || status,
      variant: 'secondary' as const,
      icon: Clock,
      color: 'text-muted-foreground',
    }
  );
}

function ShippingAddressBlock({ address }: { address: any }) {
  if (!address) return null;

  const line1 = address.address_line1 || address.address || address.line1 || '';
  const line2 = address.address_line2 || address.line2 || '';
  const city = address.city || '';
  const postalCode = address.postal_code || address.zip || '';
  const country = address.country || '';
  const name = address.name || address.full_name || '';

  if (!line1 && !city) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-medium text-foreground mb-0.5">
          Adresse de livraison
        </p>
        {name && <p className="text-muted-foreground">{name}</p>}
        <p className="text-muted-foreground">{line1}</p>
        {line2 && <p className="text-muted-foreground">{line2}</p>}
        <p className="text-muted-foreground">
          {postalCode} {city}
          {country ? `, ${country}` : ''}
        </p>
      </div>
    </div>
  );
}

function OrderTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (!history || history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-0">
      <p className="text-sm font-medium text-foreground mb-3">Chronologie</p>
      <div className="relative pl-6 space-y-4">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
        {sorted.map((entry, idx) => {
          const isLatest = idx === 0;
          return (
            <div key={entry.id} className="relative flex items-start gap-3">
              <div
                className={`absolute left-[-15px] top-1 h-[18px] w-[18px] rounded-full flex items-center justify-center ${
                  isLatest
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted border border-border'
                }`}
              >
                <CircleDot className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${isLatest ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  {STATUS_LABELS[entry.new_status] || entry.new_status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "dd MMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
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
  );
}

function OrderItemsList({ items }: { items: Order['order_items'] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Articles commandés</p>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm"
        >
          <div className="flex-1 min-w-0">
            <span className="text-foreground truncate block">
              {item.product_snapshot?.name || 'Produit'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatPrice(item.unit_price ?? 0)} × {item.quantity}
            </span>
          </div>
          <span className="font-medium text-foreground ml-2">
            {formatPrice(item.total_price ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OrderHistory({ user }: OrderHistoryProps) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user.id],
    queryFn: () => fetchOrders(user.id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
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
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = order.order_status || order.status || 'pending';
              const config = getStatusConfig(status);
              const Icon = config.icon;
              const isExpanded = expandedOrders.has(order.id);

              return (
                <div key={order.id}>
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleOrder(order.id)}
                  >
                    {/* Compact header - always visible */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            Commande #{order.id.slice(-8)}
                          </h4>
                          <Badge
                            variant={config.variant}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.created_at), 'dd MMM yyyy', {
                              locale: fr,
                            })}
                          </span>
                          {order.amount && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {formatPrice(order.amount / 100)}
                            </span>
                          )}
                          {order.order_items?.length > 0 && (
                            <span>
                              {order.order_items.length} article
                              {order.order_items.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {order.tracking_number && (
                            <span className="flex items-center gap-1 text-primary">
                              <Truck className="h-3 w-3" />
                              Suivi disponible
                            </span>
                          )}
                        </div>
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs shrink-0"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          {isExpanded ? 'Réduire' : 'Détails'}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {/* Expanded details */}
                    <CollapsibleContent>
                      <div className="mt-2 ml-3 mr-3 mb-3 p-4 bg-muted/20 rounded-lg border border-border/50 space-y-4">
                        {/* Tracking */}
                        {order.tracking_number && (
                          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <Truck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="text-sm flex-1">
                              <p className="font-medium text-foreground">
                                Suivi de livraison
                              </p>
                              <p className="text-muted-foreground">
                                {order.carrier && `${order.carrier} — `}N°{' '}
                                {order.tracking_number}
                              </p>
                              {order.estimated_delivery && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Livraison prévue :{' '}
                                  {format(
                                    new Date(order.estimated_delivery),
                                    'dd MMMM yyyy',
                                    { locale: fr }
                                  )}
                                </p>
                              )}
                              {order.actual_delivery && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Livré le{' '}
                                  {format(
                                    new Date(order.actual_delivery),
                                    'dd MMMM yyyy',
                                    { locale: fr }
                                  )}
                                </p>
                              )}
                              {order.tracking_url && (
                                <a
                                  href={order.tracking_url}
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
                        <ShippingAddressBlock
                          address={order.shipping_address}
                        />

                        {/* Order items */}
                        <OrderItemsList items={order.order_items} />

                        {/* Payment info */}
                        {order.payment_method && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            Paiement par{' '}
                            {order.payment_method === 'card'
                              ? 'carte bancaire'
                              : order.payment_method}
                          </div>
                        )}

                        {/* Timeline */}
                        <OrderTimeline history={order.order_status_history} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {index < orders.length - 1 && <Separator className="my-2" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
