import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export async function insertAdminProductRow(payload: ProductInsert) {
  const { error } = await supabase.from('products').insert(payload);
  if (error) throw error;
}

export async function updateAdminProductReturnRow(
  productId: number,
  payload: ProductUpdate
) {
  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
