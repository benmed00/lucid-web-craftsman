import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomerOrder } from '@/hooks/useOrderManagement';
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  XCircle,
  CreditCard,
  Loader,
  Navigation,
  AlertTriangle,
  PackageCheck,
  Archive,
} from 'lucide-react';

// Icon mapping for customer status
const statusIcons: Record<string, typeof CheckCircle> = {
  Clock,
  CheckCircle,
  Package,
  Truck,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  XCircle,
  CreditCard,
  Loader,
  Navigation,
  AlertTriangle,
  PackageCheck,
  Archive,
};

interface CustomerOrderTrackerProps {
  orderId: string;
}

export function CustomerOrderTracker({ orderId }: CustomerOrderTrackerProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language?.split('-')[0] || 'fr';

  const { data: order, isLoading, error } = useCustomerOrder(orderId, locale);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {locale === 'fr'
              ? 'Impossible de charger les informations de la commande'
              : 'Unable to load order information'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = statusIcons[order.status.icon] || Package;

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {locale === 'fr' ? 'Commande' : 'Order'} #{order.order_number}
            </p>
            <h2 className="text-2xl font-semibold mt-1">
              {order.status.label}
            </h2>
            <p className="text-muted-foreground mt-1">
              {order.status.description}
            </p>
          </div>
          <div
            className={`p-4 rounded-full ${order.status.color.replace('text-', 'bg-').replace('-500', '-100').replace('-600', '-100').replace('-700', '-100')}`}
          >
            <StatusIcon className={`h-8 w-8 ${order.status.color}`} />
          </div>
        </div>

        <Separator />

        {/* Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <div className="relative">
            <div className="flex justify-between">
              {order.timeline.map((event, index) => {
                const isCompleted =
                  !event.is_current &&
                  order.timeline.findIndex((e) => e.is_current) > index;
                const isCurrent = event.is_current;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center flex-1"
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-2 max-w-[80px] ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}
                    >
                      {event.label}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-5 left-8 right-8 h-0.5 bg-muted -z-10">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${Math.max(0, (order.timeline.findIndex((e) => e.is_current) / (order.timeline.length - 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Tracking Info */}
        {order.tracking && (
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'fr' ? 'Transporteur' : 'Carrier'}:{' '}
                  {order.tracking.carrier}
                </p>
                <p className="font-mono text-sm mt-1">
                  {order.tracking.tracking_number}
                </p>
              </div>
              {order.tracking.tracking_url && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={order.tracking.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {locale === 'fr' ? 'Suivre' : 'Track'}
                  </a>
                </Button>
              )}
            </div>
            {order.estimated_delivery && (
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">
                  {locale === 'fr' ? 'Livraison estimée' : 'Estimated delivery'}
                  :
                </span>{' '}
                {new Date(order.estimated_delivery).toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            )}
          </div>
        )}

        {/* Order Items */}
        <div>
          <h3 className="font-medium mb-3">
            {locale === 'fr' ? 'Articles commandés' : 'Ordered Items'}
          </h3>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'fr' ? 'Quantité' : 'Qty'}: {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  {Number(item.total_price).toFixed(2)} €
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span>
            {(order.total_amount / 100).toFixed(2)}{' '}
            {order.currency.toUpperCase()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
