/**
 * Frontend invoice client — calls the backend Edge Function.
 *
 * Architecture: invoice generation is deterministic and backend-driven.
 * The frontend NEVER builds an invoice from local state.
 * The frontend NEVER uses blob: URLs — HTML is rendered in-route via iframe.
 */
import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

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
export async function fetchInvoice(orderId: string, token?: string): Promise<InvoiceResponse> {
  if (!orderId) throw new InvoiceError('Order ID is required');

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const guestId = (() => {
    try { return localStorage.getItem('guest_id') || ''; } catch { return ''; }
  })();
  if (guestId) headers['x-guest-id'] = guestId;

  const res = await fetch(`${FUNCTIONS_URL}/generate-invoice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: orderId, token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate invoice' }));
    throw new InvoiceError(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Open the invoice route in a new tab (clean same-origin URL).
 * Page itself fetches the HTML and renders it via iframe — no blob URLs.
 */
export async function downloadInvoice(orderId: string, token?: string): Promise<void> {
  if (!orderId) throw new InvoiceError('Order ID is required');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const url = `/invoice/${orderId}${tokenParam}`;
  const win = window.open(url, '_blank', 'noopener');
  if (!win) {
    throw new InvoiceError("Popup bloqué. Autorisez les fenêtres pop-up pour télécharger la facture.");
  }
}

/** Request a short-lived (15min) order-access token for /order-confirmation. */
export async function requestOrderToken(orderId: string): Promise<string> {
  if (!orderId) throw new InvoiceError('Order ID is required');
  const res = await fetch(`${FUNCTIONS_URL}/sign-order-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new InvoiceError(err.error || `sign-order-token HTTP ${res.status}`);
  }
  const { token } = await res.json();
  if (!token) throw new InvoiceError('No token returned');
  return token;
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
export async function fetchOrderByToken(token: string): Promise<OrderByTokenResponse> {
  if (!token) throw new InvoiceError('Token is required');
  const res = await fetch(`${FUNCTIONS_URL}/get-order-by-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new InvoiceError(err.error || `get-order-by-token HTTP ${res.status}`);
  }
  return res.json();
}

/** Request a signed token for sharing/email use (30-day invoice token). */
export async function requestInvoiceToken(orderId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const guestId = (() => { try { return localStorage.getItem('guest_id') || ''; } catch { return ''; } })();
  if (guestId) headers['x-guest-id'] = guestId;

  const res = await fetch(`${FUNCTIONS_URL}/sign-invoice-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ order_id: orderId }),
  });
  if (!res.ok) throw new InvoiceError('Cannot sign token');
  const { token } = await res.json();
  return token;
}
