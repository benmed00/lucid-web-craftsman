import { supabase } from '@/integrations/supabase/client';

const ADMIN_INVENTORY_SELECT =
  'id, name, category, stock_quantity, min_stock_level, is_available, price, images';

/** Row shape the inventory UI expects (no null numeric surprises from Postgres). */
export type AdminInventoryProduct = {
  id: number;
  name: string;
  category: string;
  stock_quantity: number;
  min_stock_level: number;
  is_available: boolean;
  price: number;
  images: string[];
};

export async function fetchAdminInventoryProducts(): Promise<
  AdminInventoryProduct[]
> {
  const { data, error } = await supabase
    .from('products')
    .select(ADMIN_INVENTORY_SELECT)
    .order('name');
  if (error) throw error;
  const rows = data ?? [];
  return rows.map((p) => ({
    ...p,
    stock_quantity: p.stock_quantity ?? 0,
    min_stock_level: p.min_stock_level ?? 5,
    is_available: p.is_available ?? true,
    images: Array.isArray(p.images) ? p.images : [],
  }));
}

export type UpdateAdminProductInventoryInput = {
  productId: number;
  stock_quantity: number;
  min_stock_level: number;
  is_available: boolean;
};

export async function updateAdminProductInventory(
  args: UpdateAdminProductInventoryInput
) {
  const { error } = await supabase
    .from('products')
    .update({
      stock_quantity: args.stock_quantity,
      min_stock_level: args.min_stock_level,
      is_available: args.is_available,
    })
    .eq('id', args.productId);
  if (error) throw error;
}
