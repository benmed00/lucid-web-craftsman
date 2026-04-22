/**
 * Frontend invoice client — calls the backend Edge Function.
 *
 * Architecture: invoice generation is deterministic and backend-driven.
 * The frontend NEVER builds an invoice from local state.
 * The frontend NEVER uses blob: URLs — HTML is rendered in-route via iframe.
 */
import {
  supabase,
  resolvedSupabasePublishableKey,
} from '@/integrations/supabase/client';
import { supabaseFunctionsV1BaseUrl } from '@/lib/invoice/supabaseFunctionsBaseUrl';

const FUNCTIONS_URL = supabaseFunctionsV1BaseUrl();

export class InvoiceError extends Error {}

export interface InvoiceResponse {
  invoice_number: string;
  html: string;
  cached?: boolean;
}

/**
 * Fetch the invoice HTML from the Edge Function.
 * Strict: throws on any failure (no fallback rendering).
 */
export async function fetchInvoice(
  orderId: string,
  token?: string
): Promise<InvoiceResponse> {
  if (!orderId) throw new InvoiceError('Order ID is required');

  const {
    data: { session },
  } = await supabase.auth.getSession(); // for fetchInvoice: optional JWT for owner/admin; guests rely on `token` body
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: resolvedSupabasePublishableKey,
  };
  if (session?.access_token)
    headers.Authorization = `Bearer ${session.access_token}`; // when set, generate-invoice authorizes via RLS/ownership in the function

  // x-guest-id removed: post-Stripe guest_id often mismatched browser storage, causing spurious 401/empty data
  const res = await fetch(`${FUNCTIONS_URL}/generate-invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: orderId, token }), // token: HMAC from email or sign-order-token; primary guest auth
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'Failed to generate invoice' }));
    throw new InvoiceError(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Open the invoice route in a new tab (clean same-origin URL).
 * Page itself fetches the HTML and renders it via iframe — no blob URLs.
 */
export async function downloadInvoice(
  orderId: string,
  token?: string
): Promise<void> {
  if (!orderId) throw new InvoiceError('Order ID is required');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''; // pass HMAC to /invoice so fetchInvoice can auth without guest header
  const url = `/invoice/${orderId}${tokenParam}`; // same-origin route; child tab runs fetchInvoice
  const win = window.open(url, '_blank', 'noopener'); // new tab: PDF/print UX without replacing confirmation
  if (!win) {
    throw new InvoiceError(
      'Popup bloqué. Autorisez les fenêtres pop-up pour télécharger la facture.'
    );
  }
}

/** Request a short-lived (15min) order-access token for /order-confirmation. */
export async function requestOrderToken(orderId: string): Promise<string> {
  if (!orderId) throw new InvoiceError('Order ID is required');

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${FUNCTIONS_URL}/sign-order-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: resolvedSupabasePublishableKey,
      },
      body: JSON.stringify({ order_id: orderId }),
    });

    if (res.ok) {
      const body = await res.json();
      const token = body.token;
      if (!token) throw new InvoiceError('No token returned');
      return token;
    }

    if (res.status === 409 && attempt < maxAttempts - 1) {
      await res.text().catch(() => '');
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      continue;
    }

    const err = await res.json().catch(() => ({}));
    throw new InvoiceError(
      (err as { error?: string }).error || `sign-order-token HTTP ${res.status}`
    );
  }
}

export interface OrderByTokenResponse {
  order: {
    id: string;
    status: string;
    order_status: string;
    amount: number;
    currency: string;
    created_at: string;
    shipping_address: any;
    metadata: any;
    payment_method?: string;
    user_id?: string | null;
    /**
     * Authoritative pricing written by the Stripe webhook / verify-payment /
     * reconcile-payment after successful payment. UI should prefer this over
     * recomputing totals from `amount` (which has mixed units historically).
     */
    pricing_snapshot?: unknown | null;
    subtotal_amount?: number | null;
    discount_amount?: number | null;
    shipping_amount?: number | null;
    total_amount?: number | null;
  };
  items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    product_snapshot: any;
    product_id?: number | null;
  }>;
}

/** Fetch order + items via signed token. Throws on any failure — no fallback. */
export async function fetchOrderByToken(
  token: string
): Promise<OrderByTokenResponse> {
  if (!token) throw new InvoiceError('Token is required');
  const res = await fetch(`${FUNCTIONS_URL}/get-order-by-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: resolvedSupabasePublishableKey,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new InvoiceError(
      err.error || `get-order-by-token HTTP ${res.status}`
    );
  }
  return res.json();
}

/** Request a signed token for sharing/email use (30-day invoice token). */
export async function requestInvoiceToken(orderId: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: resolvedSupabasePublishableKey,
  };
  if (session?.access_token)
    headers.Authorization = `Bearer ${session.access_token}`; // only signed-in owners/admins or edge pairing — no x-guest-id

  const res = await fetch(`${FUNCTIONS_URL}/sign-invoice-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw new InvoiceError('Cannot sign token');
  const { token } = await res.json();
  return token;
}
