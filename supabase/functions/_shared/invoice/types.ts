/**
 * Strict invoice data contract — single source of truth for invoice generation.
 * Built once from DB, validated, then rendered. No partial structures allowed.
 */

export interface InvoiceClient {
  name: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  country: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number; // EUR
  total: number;      // EUR
}

export interface InvoiceTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

export interface InvoicePayment {
  method: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  transaction_id: string | null;
  paid_at: string | null;
}

export interface InvoiceData {
  invoice_number: string;
  order_id: string;
  order_short: string;
  issue_date: string;       // ISO
  currency: string;
  client: InvoiceClient;
  items: InvoiceItem[];
  totals: InvoiceTotals;
  payment: InvoicePayment;
}
