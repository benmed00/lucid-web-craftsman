/**
 * `products` table aliases.
 *
 * @see {@link ProductRow} — persisted row.
 * @see `src/shared/interfaces/Iproduct.interface.ts` — `Product` storefront / mock view (migrate toward `ProductRow` where possible).
 */
import type { Database } from '@/integrations/supabase/types';

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
