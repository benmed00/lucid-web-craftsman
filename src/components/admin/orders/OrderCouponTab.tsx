// Order Coupon Usage Tab
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Tag,
  Percent,
  DollarSign,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrderCouponUsage,
  validateCouponForOrder,
  type OrderCouponUsage,
} from '@/services/orderService';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface OrderCouponTabProps {
  orderId: string;
}

export function OrderCouponTab({ orderId }: OrderCouponTabProps) {
  const [couponUsage, setCouponUsage] = useState<OrderCouponUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [orderAmount, setOrderAmount] = useState(0);
  const [orderStatus, setOrderStatus] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Get order info
        const { data: order } = await supabase
          .from('orders')
          .select('amount, order_status')
          .eq('id', orderId)
          .single();

        if (order) {
          setOrderAmount(order.amount || 0);
          setOrderStatus(order.order_status || '');
        }

        // Get coupon usage
        const usage = await getOrderCouponUsage(orderId);
        setCouponUsage(usage);
      } catch (error) {
        console.error('Error fetching coupon data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [orderId]);

  const handleApplyCoupon = async () => {
    if (!newCouponCode.trim()) {
      toast.error('Veuillez entrer un code promo');
      return;
    }

    setIsApplying(true);
    try {
      const validation = await validateCouponForOrder(
        newCouponCode,
        orderAmount / 100 // Convert from cents
      );

      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }

      // Update order metadata with coupon info
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const currentMetadata = (order?.metadata || {}) as Record<string, unknown>;
      const newMetadata = {
        ...currentMetadata,
        coupon_code: newCouponCode.toUpperCase(),
        discount_amount: Math.round(validation.discount * 100), // Store in cents
        coupon_used_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          metadata: newMetadata,
          amount: orderAmount - Math.round(validation.discount * 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Increment coupon usage count - update directly
      try {
        await supabase
          .from('discount_coupons')
          .update({ usage_count: (await supabase.from('discount_coupons').select('usage_count').eq('code', newCouponCode.toUpperCase()).single()).data?.usage_count || 0 + 1 })
          .eq('code', newCouponCode.toUpperCase());
      } catch {
        // Ignore if update fails
      }

      toast.success(`Code promo appliqué: -${validation.discount.toFixed(2)} €`);
      setNewCouponCode('');

      // Refresh data
      const usage = await getOrderCouponUsage(orderId);
      setCouponUsage(usage);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Erreur lors de l\'application du code promo');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const currentMetadata = (order?.metadata || {}) as Record<string, unknown>;
      const discountAmount = (currentMetadata.discount_amount as number) || 0;

      // Remove coupon from metadata - create a clean metadata object
      const cleanMetadata: Record<string, unknown> = {};
      Object.keys(currentMetadata).forEach(key => {
        if (!['coupon_code', 'discount_amount', 'coupon_used_at'].includes(key)) {
          cleanMetadata[key] = currentMetadata[key];
        }
      });

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          metadata: cleanMetadata as unknown as null, // Cast for Supabase JSON type
          amount: orderAmount + discountAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast.success('Code promo retiré');
      setCouponUsage(null);
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (error) {
      console.error('Error removing coupon:', error);
      toast.error('Erreur lors du retrait du code promo');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const canModifyCoupon = ['created', 'payment_pending'].includes(orderStatus);

  return (
    <div className="space-y-4">
      {/* Current Coupon Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Code Promo Appliqué
          </CardTitle>
        </CardHeader>
        <CardContent>
          {couponUsage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{couponUsage.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {couponUsage.type === 'percentage' ? (
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {couponUsage.value}% de réduction
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {couponUsage.value}€ de réduction
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">
                    -{(couponUsage.discount_applied / 100).toFixed(2)} €
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Appliqué le {new Date(couponUsage.used_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {canModifyCoupon && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveCoupon}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-3 w-3 mr-2" />
                  Retirer le code promo
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucun code promo appliqué à cette commande
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply New Coupon */}
      {!couponUsage && canModifyCoupon && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Appliquer un code promo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={newCouponCode}
                onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                placeholder="Entrer le code promo"
                className="flex-1"
              />
              <Button
                onClick={handleApplyCoupon}
                disabled={isApplying || !newCouponCode.trim()}
              >
                {isApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Tag className="h-4 w-4 mr-2" />
                    Appliquer
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Le code promo ne peut être modifié qu'avant le paiement.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Info for locked coupons */}
      {!canModifyCoupon && !couponUsage && (
        <Card>
          <CardContent className="py-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Les codes promo ne peuvent plus être modifiés après le paiement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
