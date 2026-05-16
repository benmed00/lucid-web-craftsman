/**
 * `checkout_sessions` table and embedded JSON for cart snapshots.
 *
 * @see {@link CheckoutCartItemsJson} — JSON column; narrow further at use sites if needed.
 */
import type { Database } from '@/integrations/supabase/types';

export type CheckoutSessionRow =
  Database['public']['Tables']['checkout_sessions']['Row'];
export type CheckoutSessionInsert =
  Database['public']['Tables']['checkout_sessions']['Insert'];
export type CheckoutSessionUpdate =
  Database['public']['Tables']['checkout_sessions']['Update'];

/** JSON column on `checkout_sessions` — parse at use sites if structure matters. */
export type CheckoutCartItemsJson = CheckoutSessionRow['cart_items'];
