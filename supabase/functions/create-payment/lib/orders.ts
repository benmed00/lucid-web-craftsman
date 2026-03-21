import type {
  PostgrestError,
  PostgrestSingleResponse,
  SupabaseClient,
} from '@supabase/supabase-js';

import type {
  BusinessRulesSettingJson,
  CheckoutRequestBody,
  OrderInsertMetadata,
  OrderItemInsert,
  OrderRow,
  ShippingAddressPayload,
  SupabaseMutationResult,
  VerifiedCartItem,
} from '../types.ts';
import type { LogStep } from './log.ts';
import { sanitizeString } from './security.ts';

export function buildShippingAddressPayload(
  customerInfo: CheckoutRequestBody['customerInfo']
): ShippingAddressPayload | null {
  if (!customerInfo) return null;
  return {
    first_name: sanitizeString(customerInfo.firstName),
    last_name: sanitizeString(customerInfo.lastName),
    email: customerInfo.email,
    phone: sanitizeString(customerInfo.phone) || null,
    address_line1: sanitizeString(customerInfo.address),
    address_line2: sanitizeString(customerInfo.addressComplement) || null,
    city: sanitizeString(customerInfo.city),
    postal_code: sanitizeString(customerInfo.postalCode),
    country: sanitizeString(customerInfo.country) || 'FR',
  };
}

/** VIP threshold in cents (€1000 default → 100_000 cents). */
export async function fetchVipThresholdCents(
  supabase: SupabaseClient
): Promise<number> {
  const businessRulesResult: PostgrestSingleResponse<{
    setting_value?: unknown;
  }> = (await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'business_rules')
    .single()) as PostgrestSingleResponse<{ setting_value?: unknown }>;
  const businessRulesData: { setting_value?: unknown } | null =
    businessRulesResult.data;

  const businessRules: BusinessRulesSettingJson =
    (businessRulesData?.setting_value as BusinessRulesSettingJson | undefined) ||
    {};
  return (businessRules.cart?.highValueThreshold || 1000) * 100;
}

export function mapVerifiedItemsToOrderInserts(
  orderId: string,
  verifiedItems: VerifiedCartItem[]
): OrderItemInsert[] {
  return verifiedItems.map((item) => ({
    order_id: orderId,
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.product.price,
    total_price: item.product.price * item.quantity,
    product_snapshot: {
      name: item.product.name,
      description: item.product.description,
      images: item.product.images,
      price: item.product.price,
    },
  }));
}

export async function insertPaymentPendingOrder(
  supabase: SupabaseClient,
  params: {
    userId: string | null;
    totalAmountCents: number;
    shippingAddress: ShippingAddressPayload | null;
    metadata: OrderInsertMetadata;
  },
  log: LogStep
): Promise<OrderRow> {
  const orderInsertResult: PostgrestSingleResponse<OrderRow> =
    (await supabase
      .from('orders')
      .insert({
        user_id: params.userId,
        amount: params.totalAmountCents,
        currency: 'eur',
        status: 'pending',
        order_status: 'payment_pending',
        shipping_address: params.shippingAddress,
        billing_address: params.shippingAddress,
        metadata: params.metadata,
      })
      .select('*')
      .single()) as PostgrestSingleResponse<OrderRow>;
  const orderError: PostgrestError | null = orderInsertResult.error;

  if (orderError) {
    log('Error creating order', orderError);
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  return orderInsertResult.data as OrderRow;
}

export async function insertOrderLineItems(
  supabase: SupabaseClient,
  orderItems: OrderItemInsert[],
  log: LogStep
): Promise<void> {
  const orderItemsInsertResult: SupabaseMutationResult =
    (await supabase.from('order_items').insert(orderItems)) as SupabaseMutationResult;
  const itemsError: PostgrestError | null = orderItemsInsertResult.error;

  if (itemsError) {
    log('Error creating order items', itemsError);
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  log('Order items created', { itemCount: orderItems.length });
}

/** Non-blocking: logs failures, does not throw. */
export async function invokeVipOrderNotificationIfNeeded(
  supabase: SupabaseClient,
  params: {
    isVipOrder: boolean;
    customerInfo: CheckoutRequestBody['customerInfo'];
    orderId: string;
    totalAmountCents: number;
    vipThresholdCents: number;
    log: LogStep;
  }
): Promise<void> {
  const {
    isVipOrder,
    customerInfo,
    orderId,
    totalAmountCents,
    vipThresholdCents,
    log,
  } = params;

  if (!isVipOrder || !customerInfo?.email) return;

  try {
    await supabase.functions.invoke('send-vip-order-notification', {
      body: {
        order_id: orderId,
        customer_email: customerInfo.email,
        customer_name:
          `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() ||
          'Client',
        order_total: totalAmountCents / 100,
        threshold: vipThresholdCents / 100,
      },
    });
    log('VIP notification sent');
  } catch (vipError) {
    log('VIP notification failed (non-fatal)', vipError);
  }
}
