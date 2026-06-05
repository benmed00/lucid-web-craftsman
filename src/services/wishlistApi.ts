import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface WishlistRow {
  id: string;
  user_id: string;
  product_id: number;
  created_at: string;
}

export async function fetchWishlistForUser(
  userId: string
): Promise<WishlistRow[]> {
  const { data, error } = await supabase
    .from('wishlist')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as WishlistRow[]) ?? [];
}

export async function insertWishlistItem(
  userId: string,
  productId: number
): Promise<WishlistRow> {
  const { data, error } = await supabase
    .from('wishlist')
    .insert({ user_id: userId, product_id: productId })
    .select()
    .single();
  if (error) throw error;
  return data as WishlistRow;
}

export async function deleteWishlistItem(
  userId: string,
  productId: number
): Promise<void> {
  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

export function subscribeWishlistChanges(
  userId: string,
  onEvent: () => void
): RealtimeChannel {
  // Use a unique channel name per subscription to avoid reusing an
  // already-subscribed channel (which causes "cannot add postgres_changes
  // callbacks after subscribe()" when effects re-run, e.g. in StrictMode
  // or after auth changes).
  const channelName = `lwc-wishlist-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'wishlist',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onEvent();
      }
    )
    .subscribe();
}

export function removeWishlistChannel(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
