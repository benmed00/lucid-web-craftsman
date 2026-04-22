/**
 * Server cart persistence — single module for `cart_items` and `sync_cart` RPC.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { User } from '@supabase/supabase-js';

export async function fetchCartItemRowsForUser(userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function syncCartViaRpc(
  userId: string,
  items: Json
): Promise<void> {
  const { error } = await supabase.rpc('sync_cart', {
    p_user_id: userId,
    p_items: items,
  });
  if (error) throw error;
}

export async function upsertCartItemRow(input: {
  user_id: string;
  product_id: number;
  quantity: number;
}): Promise<void> {
  const { error } = await supabase.from('cart_items').upsert(input, {
    onConflict: 'user_id,product_id',
  });
  if (error) throw error;
}

export async function deleteCartItemRow(
  userId: string,
  productId: number
): Promise<void> {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

export async function deleteAllCartItemsForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getAuthUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export function onAuthStateChange(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getAuthSession() {
  return supabase.auth.getSession();
}
