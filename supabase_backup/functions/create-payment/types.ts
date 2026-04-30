// Domain types for create-payment — pipeline and mappings: see `DATA_FLOW.md`.
import type { PostgrestError } from '@supabase/supabase-js';

/** Matches awaited `.select().in()` shape for untyped `SupabaseClient` */
export type SupabaseListResult<T> = {
  data: T | null;
  error: PostgrestError | null;
};

/** Matches awaited `.insert()` without `.select()` */
export type SupabaseMutationResult = {
  data: null;
  error: PostgrestError | null;
};

export type CheckoutSessionLineItem = {
  price_data: {
    currency: 'eur';
    product_data: {
      name: string;
      description: string;
      images?: string[];
    };
    unit_amount: number;
  };
  quantity: number;
};

export type BusinessRulesSettingJson = {
  cart?: { highValueThreshold?: number };
};

export type PaymentEventInput = {
  order_id?: string;
  event_type: string;
  status: string;
  actor: string;
  correlation_id?: string;
  error_message?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  duration_ms?: number;
};

/** Loose client JSON; prefer `ParsedCheckoutRequest` after `parseCheckoutRequestBody`. */
export type CheckoutRequestBody = {
  items?: unknown;
  customerInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressComplement?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  discount?: {
    code?: string;
    amount?: number;
    includesFreeShipping?: boolean;
  };
  guestSession?: {
    guest_id?: string;
    device_type?: string;
    os?: string;
    browser?: string;
  };
};

export type GuestMetadata = {
  guest_id: string;
  device_type: string;
  os: string;
  browser: string;
};

export type CheckoutCartItem = {
  product: { id: number; price?: number };
  quantity: number;
};

export type DbProductRow = {
  id: number;
  name: string;
  price: number;
  stock_quantity: number | null;
  is_active: boolean | null;
  is_available: boolean | null;
  images: string[] | null;
  description: string | null;
};

/** Server-trusted product slice (DB-backed) reused for Stripe lines + order_items snapshot */
export type VerifiedProductSnapshot = {
  id: number;
  name: string;
  price: number;
  description: string;
  images: string[];
};

/** DB-trusted prices/names for Stripe `line_items` and `order_items` snapshot. */
export type VerifiedCartItem = {
  product: VerifiedProductSnapshot;
  quantity: number;
};

export type DiscountCouponRow = {
  code: string;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  usage_count: number | null;
  minimum_order_amount: number | null;
  type: string;
  value: number;
  maximum_discount_amount: number | null;
  includes_free_shipping: boolean | null;
};

export type ShippingAddressPayload = {
  first_name: string;
  last_name: string;
  email: string | undefined;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string;
  country: string;
};

export type OrderInsertMetadata = {
  correlation_id: string;
  guest_id: string | null;
  device_type: string | null;
  os: string | null;
  browser: string | null;
  client_ip: string;
  client_country: string | null;
  discount_code: string | null;
  discount_amount_cents: number;
  is_vip_order: boolean;
  verified_subtotal_cents: number;
};

export type OrderRow = {
  id: string;
  /** Present when row is loaded with `select('*')` after insert. */
  metadata?: Record<string, unknown> | null;
};

export type OrderItemInsert = {
  order_id: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: Pick<
    VerifiedProductSnapshot,
    'name' | 'description' | 'images' | 'price'
  >;
};

export type PrefillStripeAddress = {
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  country: string;
};
