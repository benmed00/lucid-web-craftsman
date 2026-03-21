// Cart mapping: CheckoutCartItem[] + DB products → VerifiedCartItem[] (trusted prices).
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CheckoutCartItem,
  DbProductRow,
  SupabaseListResult,
  VerifiedCartItem,
} from '../types.ts';
import type { LogStep } from './log.ts';

export function collectProductIds(cartItems: CheckoutCartItem[]): number[] {
  return cartItems
    .map((item: CheckoutCartItem) => item.product.id)
    .filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id)
    );
}

/** Loads product rows for checkout verification; throws on DB error or empty result. */
export async function fetchProductsForCart(
  supabase: SupabaseClient,
  productIds: number[],
  log: LogStep
): Promise<DbProductRow[]> {
  const productsQuery: SupabaseListResult<DbProductRow[]> =
    (await supabase
      .from('products')
      .select(
        'id, name, price, stock_quantity, is_active, is_available, images, description'
      )
      .in('id', productIds)) as SupabaseListResult<DbProductRow[]>;

  if (productsQuery.error || !productsQuery.data) {
    log('Error fetching products', productsQuery.error);
    throw new Error('Failed to verify product prices');
  }

  return productsQuery.data;
}

/** Builds server-trusted line items; throws on missing product, inactive, or insufficient stock. */
export function buildVerifiedCartItems(
  cartItems: CheckoutCartItem[],
  dbProductRows: DbProductRow[],
  log: LogStep
): VerifiedCartItem[] {
  const productMap: Map<number, DbProductRow> = new Map(
    dbProductRows.map((p: DbProductRow) => [p.id, p])
  );

  const verifiedItems: VerifiedCartItem[] = [];

  for (const item of cartItems) {
    const dbProduct: DbProductRow | undefined = productMap.get(
      item.product.id
    );
    if (!dbProduct) {
      throw new Error(`Produit introuvable: ${item.product.id}`);
    }
    if (dbProduct.is_active === false || dbProduct.is_available === false) {
      throw new Error(`Produit indisponible: ${dbProduct.name}`);
    }
    if (
      dbProduct.stock_quantity !== null &&
      dbProduct.stock_quantity < item.quantity
    ) {
      throw new Error(
        `Stock insuffisant pour ${dbProduct.name}: ${dbProduct.stock_quantity} restant(s)`
      );
    }

    if (Math.abs((item.product.price || 0) - dbProduct.price) > 0.01) {
      log('Price discrepancy detected', {
        productId: dbProduct.id,
        clientPrice: item.product.price,
        dbPrice: dbProduct.price,
      });
    }

    verifiedItems.push({
      product: {
        id: dbProduct.id,
        name: dbProduct.name,
        price: dbProduct.price,
        description: dbProduct.description || dbProduct.name,
        images: dbProduct.images || [],
      },
      quantity: item.quantity,
    });
  }

  return verifiedItems;
}
