import { supabase } from '@/integrations/supabase/client';

export async function insertBackInStockNotification(row: {
  product_id: number;
  email: string;
  user_id: string | null;
  status: string;
}) {
  return supabase.from('back_in_stock_notifications').insert(row);
}
