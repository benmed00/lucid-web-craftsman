/**
 * Typed Supabase access for checkout flow, payment edge functions, and related reads.
 * Keep components/hooks free of direct `supabase` usage for these operations.
 *
 * Canonical row types: `@/types/domain/checkout`. Edge JSON bodies: `@/types/contracts`.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import {
  parseCreatePaymentInvokeBody,
  parseOrderLookupResponse,
  parseStripeSessionDisplayResponse,
  type CreatePaymentInvokeBody,
  type OrderLookupResponse,
  type StripeSessionDisplayResponse,
} from '@/types/contracts/edge-invoke-responses';
import type {
  CheckoutSessionInsert,
  CheckoutSessionRow,
  CheckoutSessionUpdate,
} from '@/types/domain/checkout';

export type { CheckoutSessionRow } from '@/types/domain/checkout';

/** Columns loaded by `CHECKOUT_FORM_HYDRATION_SELECT` for form rehydration. */
export type CheckoutFormHydrationSnapshot = Pick<
  CheckoutSessionRow,
  | 'personal_info'
  | 'shipping_info'
  | 'current_step'
  | 'last_completed_step'
  | 'promo_code'
  | 'promo_code_valid'
  | 'promo_discount_type'
  | 'promo_discount_value'
  | 'promo_discount_applied'
  | 'promo_free_shipping'
>;

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
  return data ?? null;
}

const CHECKOUT_FORM_HYDRATION_SELECT =
  'personal_info, shipping_info, current_step, last_completed_step, promo_code, promo_code_valid, promo_discount_type, promo_discount_value, promo_discount_applied, promo_free_shipping';

/** Lighter row for checkout form rehydration (useCheckoutFormPersistence). */
export async function fetchCheckoutFormSnapshotByUserId(
  userId: string
): Promise<CheckoutFormHydrationSnapshot | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select(CHECKOUT_FORM_HYDRATION_SELECT)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CheckoutFormHydrationSnapshot | null) ?? null;
}

export async function fetchCheckoutFormSnapshotByGuestId(
  guestId: string
): Promise<CheckoutFormHydrationSnapshot | null> {
  const { data, error } = await supabase
    .from('checkout_sessions')
    .select(CHECKOUT_FORM_HYDRATION_SELECT)
    .eq('guest_id', guestId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CheckoutFormHydrationSnapshot | null) ?? null;
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
  return data ?? null;
}

export async function insertCheckoutSession(
  row: CheckoutSessionInsert
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
  updates: CheckoutSessionUpdate | Record<string, unknown>
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

export async function fetchFreeShippingThresholdSetting(): Promise<Json | null> {
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
): Promise<Json | null> {
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

function toInvokeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export async function invokeCreatePaymentEdge(
  functionName: 'create-payment' | 'create-paypal-payment',
  body: unknown,
  headers: Record<string, string>
): Promise<EdgeInvokeResult<CreatePaymentInvokeBody>> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body as Record<string, unknown>,
    headers,
  });
  if (error) {
    return {
      data:
        data !== null && data !== undefined
          ? parseCreatePaymentInvokeBody(data)
          : null,
      error: toInvokeError(error),
    };
  }
  return {
    data: parseCreatePaymentInvokeBody(data),
    error: null,
  };
}

export type OrderLookupInvokeBody =
  | { order_id: string; session_id?: never }
  | { session_id: string; order_id?: never };

export async function invokeOrderLookup(
  body: OrderLookupInvokeBody
): Promise<EdgeInvokeResult<OrderLookupResponse>> {
  const { data, error } = await supabase.functions.invoke('order-lookup', {
    body,
  });
  if (error) {
    return { data: null, error: toInvokeError(error) };
  }
  const parsed = parseOrderLookupResponse(data);
  if (!parsed.ok) {
    return {
      data: null,
      error: new Error('order-lookup returned unexpected JSON shape'),
    };
  }
  return { data: parsed.data, error: null };
}

export async function invokeStripeSessionDisplay(
  sessionId: string
): Promise<EdgeInvokeResult<StripeSessionDisplayResponse>> {
  const { data, error } = await supabase.functions.invoke(
    'stripe-session-display',
    {
      body: { session_id: sessionId },
    }
  );
  if (error) {
    return { data: null, error: toInvokeError(error) };
  }
  const parsed = parseStripeSessionDisplayResponse(data);
  if (!parsed.ok) {
    return {
      data: null,
      error: new Error('stripe-session-display returned unexpected JSON shape'),
    };
  }
  return { data: parsed.data, error: null };
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
