// Order Customer Information Tab - Supports both registered users and guests
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  CreditCard,
  Award,
  ExternalLink,
  History,
  UserX,
  Monitor,
  Smartphone,
  Globe,
} from 'lucide-react';
import { getOrderCustomerInfo, type OrderCustomerInfo } from '@/services/orderService';
import { supabase } from '@/integrations/supabase/client';

interface OrderCustomerTabProps {
  orderId: string;
}

interface GuestInfo {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  guest_id: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  client_ip: string | null;
}

interface OrderData {
  user_id: string | null;
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
}

const LOYALTY_TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: '🥉' },
  silver: { label: 'Argent', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', icon: '🥈' },
  gold: { label: 'Or', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '🥇' },
  platinum: { label: 'Platine', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: '💎' },
};

export function OrderCustomerTab({ orderId }: OrderCustomerTabProps) {
  const [customer, setCustomer] = useState<OrderCustomerInfo | null>(null);
  const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string;
    created_at: string;
    amount: number;
    order_status: string;
  }>>([]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Get order data including shipping_address and metadata
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('user_id, shipping_address, billing_address, metadata')
          .eq('id', orderId)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          return;
        }

        const orderData = order as OrderData;

        // If no user_id, this is a guest order
        if (!orderData?.user_id) {
          setIsGuest(true);
          
          // Extract guest info from shipping_address and metadata
          const shippingAddr = orderData?.shipping_address || {};
          const billingAddr = orderData?.billing_address || {};
          const metadata = orderData?.metadata || {};
          
          setGuestInfo({
            first_name: shippingAddr.first_name || billingAddr.first_name || null,
            last_name: shippingAddr.last_name || billingAddr.last_name || null,
            email: shippingAddr.email || billingAddr.email || null,
            phone: shippingAddr.phone || billingAddr.phone || null,
            address_line1: shippingAddr.address_line1 || null,
            address_line2: shippingAddr.address_line2 || null,
            city: shippingAddr.city || null,
            postal_code: shippingAddr.postal_code || null,
            country: shippingAddr.country || null,
            guest_id: (metadata.guest_id as string) || null,
            device_type: (metadata.device_type as string) || null,
            browser: (metadata.browser as string) || null,
            os: (metadata.os as string) || null,
            client_ip: (metadata.client_ip as string) || null,
          });
          return;
        }

        // For registered users, get full profile info
        setIsGuest(false);
        const customerInfo = await getOrderCustomerInfo(orderData.user_id);
        setCustomer(customerInfo);

        // Get recent orders
        const { data: orders } = await supabase
          .from('orders')
          .select('id, created_at, amount, order_status')
          .eq('user_id', orderData.user_id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentOrders(orders || []);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Guest order display
  if (isGuest && guestInfo) {
    const hasContactInfo = guestInfo.email || guestInfo.phone;
    const hasAddress = guestInfo.address_line1 || guestInfo.city;
    const fullName = [guestInfo.first_name, guestInfo.last_name].filter(Boolean).join(' ');

    return (
      <div className="space-y-4">
        {/* Guest Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Client Invité
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <UserX className="h-3 w-3" />
                Guest
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Contact Info */}
              <div className="space-y-3">
                {fullName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{fullName}</span>
                  </div>
                )}
                {guestInfo.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{guestInfo.email}</span>
                  </div>
                )}
                {guestInfo.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{guestInfo.phone}</span>
                  </div>
                )}
                {hasAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      {guestInfo.address_line1 && <p>{guestInfo.address_line1}</p>}
                      {guestInfo.address_line2 && <p>{guestInfo.address_line2}</p>}
                      <p>
                        {guestInfo.postal_code} {guestInfo.city}
                      </p>
                      {guestInfo.country && (
                        <p className="font-medium">
                          {guestInfo.country === 'FR' ? 'France' : guestInfo.country}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!hasContactInfo && !hasAddress && (
                  <p className="text-sm text-muted-foreground">
                    Aucune information de contact disponible
                  </p>
                )}
              </div>

              {/* Device/Session Info */}
              <div className="space-y-3">
                {guestInfo.guest_id && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Guest ID</span>
                    </div>
                    <span className="font-mono text-xs">{guestInfo.guest_id}</span>
                  </div>
                )}
                {guestInfo.device_type && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {guestInfo.device_type === 'Mobile' ? (
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">Appareil</span>
                    </div>
                    <span className="text-sm">{guestInfo.device_type}</span>
                  </div>
                )}
                {guestInfo.browser && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Navigateur</span>
                    </div>
                    <span className="text-sm">{guestInfo.browser}</span>
                  </div>
                )}
                {guestInfo.client_ip && guestInfo.client_ip !== 'Unknown' && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">IP</span>
                    </div>
                    <span className="font-mono text-xs">{guestInfo.client_ip}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
              Cette commande a été passée en tant qu'invité. Aucun compte utilisateur n'est associé.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No customer info at all
  if (!customer) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Informations client non disponibles
          </p>
        </CardContent>
      </Card>
    );
  }

  // Registered user display
  const tierConfig = LOYALTY_TIER_CONFIG[customer.loyalty_tier || 'bronze'];

  return (
    <div className="space-y-4">
      {/* Customer Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Profil Client
            </CardTitle>
            <Badge className={tierConfig.color}>
              {tierConfig.icon} {tierConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{customer.full_name || 'Non renseigné'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{customer.phone}</span>
                </div>
              )}
              {customer.address_line1 && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p>{customer.address_line1}</p>
                    <p>{customer.postal_code} {customer.city}</p>
                    <p>{customer.country}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Commandes</span>
                </div>
                <span className="font-bold">{customer.total_orders}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Total dépensé</span>
                </div>
                <span className="font-bold">{(customer.total_spent / 100).toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Points fidélité</span>
                </div>
                <span className="font-bold">{customer.loyalty_points}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/admin/customers?id=${customer.id}`} target="_blank" rel="noopener">
                <ExternalLink className="h-3 w-3 mr-2" />
                Voir profil complet
              </a>
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-3 w-3 mr-2" />
              Contacter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Commandes récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune commande
            </p>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div 
                  key={order.id} 
                  className={`py-3 flex items-center justify-between ${
                    order.id === orderId ? 'bg-muted/50 -mx-4 px-4 rounded' : ''
                  }`}
                >
                  <div>
                    <p className="font-mono text-sm">
                      #{order.id.slice(0, 8).toUpperCase()}
                      {order.id === orderId && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Actuelle
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{(order.amount / 100).toFixed(2)} €</p>
                    <Badge variant="outline" className="text-xs">
                      {order.order_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}