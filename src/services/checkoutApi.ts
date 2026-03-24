/**
 * Typed Supabase access for checkout flow, payment edge functions, and related reads.
 * Keep components/hooks free of direct `supabase` usage for these operations.
 */
import { supabase } from '@/integrations/supabase/client';

export type CheckoutSessionRow = Record<string, unknown> & {
  id: string;
  guest_id: string | null;
  user_id: string | null;
  current_step: number;
  last_completed_step: number;
  status: string;
  personal_info: unknown;
  shipping_info: unknown;
  promo_code: string | null;
  promo_code_valid: boolean | null;
  promo_discount_type: string | null;
  promo_discount_value: number | null;
  promo_discount_applied: number | null;
  promo_free_shipping: boolean;
  cart_items: unknown;
  subtotal: number | null;
  shipping_cost: number | null;
  total: number | null;
  order_id: string | null;
  created_at?: string;
};

export async function fetchActiveCheckoutSessionByUserId(
  userId: string
): Promise<CheckoutSessionRow | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CheckoutSessionRow) ?? null;
}

const CHECKOUT_FORM_HYDRATION_SELECT =
  'personal_info, shipping_info, current_step, last_completed_step, promo_code, promo_code_valid, promo_discount_type, promo_discount_value, promo_discount_applied, promo_free_shipping';

/** Lighter row for checkout form rehydration (useCheckoutFormPersistence). */
export async function fetchCheckoutFormSnapshotByUserId(
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select(CHECKOUT_FORM_HYDRATION_SELECT)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown>) ?? null;
}

export async function fetchCheckoutFormSnapshotByGuestId(
  guestId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select(CHECKOUT_FORM_HYDRATION_SELECT)
    .eq('guest_id', guestId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown>) ?? null;
}

export async function fetchActiveCheckoutSessionByGuestId(
  guestId: string
): Promise<CheckoutSessionRow | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select('*')
    .eq('guest_id', guestId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CheckoutSessionRow) ?? null;
}

export async function insertCheckoutSession(
  row: Record<string, unknown>
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string } | null;
}

export async function updateCheckoutSessionRow(
  sessionId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('checkout_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function fetchFreeShippingThresholdSetting(): Promise<
  unknown | null
> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'free_shipping_threshold')
    .maybeSingle();
  if (error) return null;
  return data?.setting_value ?? null;
}

export async function validateCouponCodeRpc(
  code: string
): Promise<unknown | null> {
  const { data, error } = await supabase
    .rpc('validate_coupon_code', { p_code: code })
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export type EdgeInvokeResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function invokeCreatePaymentEdge(
  functionName: 'create-payment' | 'create-paypal-payment',
  body: unknown,
  headers: Record<string, string>
): Promise<EdgeInvokeResult<{ url?: string }>> {
  return supabase.functions.invoke(functionName, {
    body,
    headers,
  }) as Promise<EdgeInvokeResult<{ url?: string }>>;
}

export async function invokeOrderLookup(
  sessionId: string
): Promise<EdgeInvokeResult<unknown>> {
  return supabase.functions.invoke('order-lookup', {
    body: { session_id: sessionId },
  }) as Promise<EdgeInvokeResult<unknown>>;
}

export async function invokeStripeSessionDisplay(
  sessionId: string
): Promise<EdgeInvokeResult<unknown>> {
  return supabase.functions.invoke('stripe-session-display', {
    body: { session_id: sessionId },
  }) as Promise<EdgeInvokeResult<unknown>>;
}

export async function invokeVerifyPaypalPayment(body: {
  paypal_order_id: string | null;
  order_id: string | null;
}): Promise<EdgeInvokeResult<unknown>> {
  return supabase.functions.invoke('verify-paypal-payment', {
    body,
  }) as Promise<EdgeInvokeResult<unknown>>;
}

export async function invokeOrderConfirmationLookup(body: {
  token: string;
  order_reference: string | null;
}): Promise<EdgeInvokeResult<unknown>> {
  return supabase.functions.invoke('order-confirmation-lookup', {
    body,
  }) as Promise<EdgeInvokeResult<unknown>>;
}

/** Local sign-out used when checkout_sessions insert fails with auth errors. */
export async function signOutLocalScope(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}
