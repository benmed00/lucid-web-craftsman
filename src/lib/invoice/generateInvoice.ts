/**
 * Frontend invoice client — calls the backend Edge Function.
 *
 * Architecture: invoice generation is deterministic and backend-driven.
 * The frontend NEVER builds an invoice from local state.
 */
import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

export class InvoiceError extends Error {}

interface InvoiceResponse {
  invoice_number: string;
  html: string;
  cached?: boolean;
}

async function callGenerateInvoice(orderId: string, token?: string): Promise<InvoiceResponse> {
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
 * Open invoice in a new tab, ready to print/save as PDF.
 * orderId is the only required input — everything else is fetched server-side.
 */
export async function downloadInvoice(orderId: string, token?: string): Promise<void> {
  if (!orderId) throw new InvoiceError('Order ID is required');

  // Open the popup synchronously (some browsers block async window.open)
  const win = window.open('', '_blank');
  if (!win) {
    throw new InvoiceError('Popup bloqué. Autorisez les fenêtres pop-up pour télécharger la facture.');
  }
  win.document.write('<!DOCTYPE html><html><head><title>Facture — Chargement…</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#7a7a7a}</style></head><body>Génération de la facture…</body></html>');

  try {
    const { html } = await callGenerateInvoice(orderId, token);
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (e) {
    win.document.body.innerHTML = `<div style="font-family:sans-serif;padding:40px;color:#a04040">Erreur : ${e instanceof Error ? e.message : 'Échec de génération'}</div>`;
    throw e;
  }
}

/** Request a signed token for sharing/email use. */
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
