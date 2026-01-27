// Order Customer Information Tab
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
} from 'lucide-react';
import { getOrderCustomerInfo, type OrderCustomerInfo } from '@/services/orderService';
import { supabase } from '@/integrations/supabase/client';

interface OrderCustomerTabProps {
  orderId: string;
}

const LOYALTY_TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'bg-orange-100 text-orange-800', icon: '🥉' },
  silver: { label: 'Argent', color: 'bg-gray-100 text-gray-800', icon: '🥈' },
  gold: { label: 'Or', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' },
  platinum: { label: 'Platine', color: 'bg-purple-100 text-purple-800', icon: '💎' },
};

export function OrderCustomerTab({ orderId }: OrderCustomerTabProps) {
  const [customer, setCustomer] = useState<OrderCustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        // Get order's user_id
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', orderId)
          .single();

        if (orderError || !order?.user_id) {
          setCustomer(null);
          return;
        }

        // Get customer info
        const customerInfo = await getOrderCustomerInfo(order.user_id);
        setCustomer(customerInfo);

        // Get recent orders
        const { data: orders } = await supabase
          .from('orders')
          .select('id, created_at, amount, order_status')
          .eq('user_id', order.user_id)
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

  if (!customer) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Commande invité - Pas de profil client associé
          </p>
        </CardContent>
      </Card>
    );
  }

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
