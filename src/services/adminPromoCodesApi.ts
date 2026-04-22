import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CouponInsert = Database['public']['Tables']['discount_coupons']['Insert'];
type CouponUpdate = Database['public']['Tables']['discount_coupons']['Update'];

export async function fetchDiscountCouponsOrdered() {
  const { data, error } = await supabase
    .from('discount_coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateDiscountCouponById(
  id: string,
  patch: CouponUpdate
) {
  const { error } = await supabase
    .from('discount_coupons')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function insertDiscountCouponRow(row: CouponInsert) {
  const { error } = await supabase.from('discount_coupons').insert(row);
  if (error) throw error;
}

export async function insertDiscountCouponReturning(row: CouponInsert) {
  const { data, error } = await supabase
    .from('discount_coupons')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDiscountCouponById(id: string) {
  const { error } = await supabase
    .from('discount_coupons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
