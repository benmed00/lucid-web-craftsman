import { supabase } from '@/integrations/supabase/client';

const ADMIN_INVENTORY_SELECT =
  'id, name, category, stock_quantity, min_stock_level, is_available, price, images';

export async function fetchAdminInventoryProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(ADMIN_INVENTORY_SELECT)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function updateAdminProductInventory(args: {
  productId: number;
  stock_quantity: number;
  min_stock_level: number;
  is_available: boolean;
}) {
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
