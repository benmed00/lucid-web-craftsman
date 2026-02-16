// Enhanced Order Service with integrated product, customer, coupon and payment management
import { supabase } from '@/integrations/supabase/client';
import type { OrderStatus } from '@/types/order.types';

// ==================== Order Service Types ====================

export interface OrderCustomerInfo {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  total_orders: number;
  total_spent: number;
  loyalty_tier: string | null;
  loyalty_points: number;
}

export interface OrderCouponUsage {
  id: string;
  code: string;
  type: string;
  value: number;
  discount_applied: number;
  order_id: string;
  used_at: string;
}

export interface OrderPaymentDetails {
  payment_method: string | null;
  payment_reference: string | null;
  stripe_session_id: string | null;
  amount: number;
  currency: string;
  paid_at: string | null;
  refund_amount: number;
  refund_status: 'none' | 'partial' | 'full';
  refund_history: RefundRecord[];
}

export interface RefundRecord {
  id: string;
  amount: number;
  reason: string;
  processed_by: string;
  processed_at: string;
  stripe_refund_id: string | null;
}

export interface ProductStockInfo {
  product_id: number;
  product_name: string;
  current_stock: number;
  reserved_qty: number;
  available_qty: number;
}

export interface OrderQuickAction {
  id: string;
  label: string;
  labelFr: string;
  icon: string;
  category: 'status' | 'communication' | 'logistics' | 'payment' | 'admin';
  action: (orderId: string) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

// ==================== Customer Service ====================

export async function getOrderCustomerInfo(userId: string): Promise<OrderCustomerInfo | null> {
  try {
    // Get profile info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, address_line1, city, postal_code, country')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get user email from auth (if accessible via RLS)
    const { data: authUser } = await supabase.auth.getUser();
    
    // Get order stats
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('amount')
      .eq('user_id', userId)
      .in('order_status', ['paid', 'validated', 'preparing', 'shipped', 'delivered']);

    if (ordersError) throw ordersError;

    // Get loyalty info
    const { data: loyalty } = await supabase
      .from('loyalty_points')
      .select('tier, points_balance')
      .eq('user_id', userId)
      .single();

    const totalOrders = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0;

    return {
      id: profile.id,
      full_name: profile.full_name,
      email: authUser?.user?.email || 'N/A',
      phone: profile.phone,
      address_line1: profile.address_line1,
      city: profile.city,
      postal_code: profile.postal_code,
      country: profile.country,
      total_orders: totalOrders,
      total_spent: totalSpent,
      loyalty_tier: loyalty?.tier || 'bronze',
      loyalty_points: loyalty?.points_balance || 0,
    };
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return null;
  }
}

// ==================== Coupon Service ====================

export async function getOrderCouponUsage(orderId: string): Promise<OrderCouponUsage | null> {
  try {
    // Check order metadata for coupon info
    const { data: order, error } = await supabase
      .from('orders')
      .select('metadata')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    const metadata = order?.metadata as Record<string, unknown> | null;
    if (!metadata?.coupon_code) return null;

    // Get coupon details
    const { data: coupon, error: couponError } = await supabase
      .from('discount_coupons')
      .select('id, code, type, value')
      .eq('code', metadata.coupon_code as string)
      .single();

    if (couponError) return null;

    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount_applied: (metadata.discount_amount as number) || 0,
      order_id: orderId,
      used_at: (metadata.coupon_used_at as string) || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching coupon usage:', error);
    return null;
  }
}

export async function validateCouponForOrder(
  code: string,
  orderAmount: number,
  userId?: string
): Promise<{ valid: boolean; discount: number; message: string }> {
  try {
    const { data: coupon, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, discount: 0, message: 'Code promo invalide' };
    }

    // Check validity dates
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { valid: false, discount: 0, message: 'Code promo pas encore valide' };
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { valid: false, discount: 0, message: 'Code promo expiré' };
    }

    // Check minimum order amount
    if (coupon.minimum_order_amount && orderAmount < coupon.minimum_order_amount) {
      return { 
        valid: false, 
        discount: 0, 
        message: `Montant minimum requis: ${coupon.minimum_order_amount}€` 
      };
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { valid: false, discount: 0, message: 'Limite d\'utilisation atteinte' };
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = orderAmount * (coupon.value / 100);
      if (coupon.maximum_discount_amount && discount > coupon.maximum_discount_amount) {
        discount = coupon.maximum_discount_amount;
      }
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, orderAmount);
    }

    return { valid: true, discount, message: 'Code promo appliqué' };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return { valid: false, discount: 0, message: 'Erreur de validation' };
  }
}

// ==================== Payment Service ====================

export async function getOrderPaymentDetails(orderId: string): Promise<OrderPaymentDetails | null> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_method, payment_reference, stripe_session_id, amount, currency, created_at, metadata, order_status')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    const metadata = order?.metadata as Record<string, unknown> | null;
    const refundHistory = (metadata?.refund_history as RefundRecord[]) || [];
    const totalRefunded = refundHistory.reduce((sum, r) => sum + r.amount, 0);

    let refundStatus: 'none' | 'partial' | 'full' = 'none';
    if (totalRefunded > 0) {
      refundStatus = totalRefunded >= (order.amount || 0) ? 'full' : 'partial';
    }

    return {
      payment_method: order.payment_method,
      payment_reference: order.payment_reference,
      stripe_session_id: order.stripe_session_id,
      amount: order.amount || 0,
      currency: order.currency || 'eur',
      paid_at: ['paid', 'validated', 'preparing', 'shipped', 'delivered'].includes(order.order_status || '') 
        ? order.created_at 
        : null,
      refund_amount: totalRefunded,
      refund_status: refundStatus,
      refund_history: refundHistory,
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    return null;
  }
}

export async function processRefund(
  orderId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');

    // Get current order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('amount, metadata, order_status')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const currentMetadata = (order?.metadata || {}) as Record<string, unknown>;
    const existingRefunds = (currentMetadata.refund_history as RefundRecord[]) || [];
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const orderAmount = order?.amount || 0;

    // Validate refund amount
    if (amount <= 0) {
      return { success: false, message: 'Le montant du remboursement doit être positif' };
    }
    if (totalRefunded + amount > orderAmount) {
      return { success: false, message: 'Le montant du remboursement dépasse le total de la commande' };
    }

    // Create refund record
    const refundRecord: RefundRecord = {
      id: crypto.randomUUID(),
      amount,
      reason,
      processed_by: userId,
      processed_at: new Date().toISOString(),
      stripe_refund_id: null, // Would be set by actual Stripe integration
    };

    const newRefundHistory = [...existingRefunds, refundRecord];
    const newTotalRefunded = totalRefunded + amount;
    const isFullRefund = newTotalRefunded >= orderAmount;

    // Update order with refund info and status if full refund
    const updateData: Record<string, unknown> = {
      metadata: {
        ...currentMetadata,
        refund_history: newRefundHistory,
      },
      updated_at: new Date().toISOString(),
    };

    // Update order status if it's a full refund
    if (isFullRefund && !['refunded', 'cancelled'].includes(order.order_status || '')) {
      updateData.order_status = 'refunded';
    } else if (newTotalRefunded > 0 && newTotalRefunded < orderAmount) {
      updateData.order_status = 'partially_refunded';
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) throw updateError;

    return { 
      success: true, 
      message: isFullRefund 
        ? 'Remboursement complet effectué' 
        : 'Remboursement partiel effectué' 
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { success: false, message: 'Erreur lors du traitement du remboursement' };
  }
}

// ==================== Product Stock Service ====================

export async function getOrderProductsStock(orderItems: Array<{ product_id: number }>): Promise<ProductStockInfo[]> {
  try {
    const productIds = orderItems.map(item => item.product_id);
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    if (error) throw error;

    return (products || []).map(p => ({
      product_id: p.id,
      product_name: p.name,
      current_stock: 0, // Stock tracking would be done via a separate inventory system
      reserved_qty: 0,
      available_qty: 0,
    }));
  } catch (error) {
    console.error('Error fetching product stock:', error);
    return [];
  }
}

// ==================== Bulk Operations ====================

export async function bulkUpdateOrderStatus(
  orderIds: string[],
  newStatus: OrderStatus,
  reasonMessage?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  const userId = (await supabase.auth.getUser()).data.user?.id;

  for (const orderId of orderIds) {
    try {
      const { data, error } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus,
        p_actor: 'admin',
        p_actor_user_id: userId,
        p_reason_code: null,
        p_reason_message: reasonMessage || null,
        p_metadata: {},
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string };
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`${orderId.slice(0, 8)}: ${result.error}`);
      }
    } catch (error: unknown) {
      failed++;
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${orderId.slice(0, 8)}: ${errMessage}`);
    }
  }

  return { success, failed, errors };
}

export async function bulkExportOrders(orderIds: string[]): Promise<string> {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, order_status, amount, currency,
        carrier, tracking_number, shipping_address,
        order_items (quantity, unit_price, product_snapshot)
      `)
      .in('id', orderIds);

    if (error) throw error;

    // Create CSV
    const headers = ['ID', 'Date', 'Statut', 'Montant', 'Devise', 'Transporteur', 'Suivi', 'Articles'];
    const rows = (orders || []).map(order => {
      const items = order.order_items?.map((item) => {
        const snapshot = item.product_snapshot as Record<string, unknown> | null;
        return `${snapshot?.name || 'Produit'} x${item.quantity}`;
      }).join('; ') || '';
      
      return [
        order.id,
        new Date(order.created_at).toLocaleDateString('fr-FR'),
        order.order_status,
        ((order.amount || 0) / 100).toFixed(2),
        order.currency?.toUpperCase(),
        order.carrier || '',
        order.tracking_number || '',
        items,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  } catch (error) {
    console.error('Error exporting orders:', error);
    throw error;
  }
}

// ==================== Statistics ====================

export async function getOrdersStatsByPeriod(startDate: string, endDate: string) {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('amount, order_status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const paid = orders.filter(o => 
      ['paid', 'validated', 'preparing', 'shipped', 'delivered'].includes(o.order_status || '')
    );

    return {
      total_orders: orders.length,
      paid_orders: paid.length,
      total_revenue: paid.reduce((sum, o) => sum + (o.amount || 0), 0),
      average_order_value: paid.length > 0 
        ? paid.reduce((sum, o) => sum + (o.amount || 0), 0) / paid.length 
        : 0,
      conversion_rate: orders.length > 0 
        ? (paid.length / orders.length) * 100 
        : 0,
    };
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return null;
  }
}
