/**
 * Single server write path for authenticated cart line sync (sync_cart RPC).
 * UI and hooks should not call `syncCartViaRpc` directly — use this module so
 * TanStack Query keys stay consistent.
 */
import type { Json } from '@/integrations/supabase/types';
import { cartServerQueryKeys } from '@/lib/checkout/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { syncCartViaRpc } from '@/services/cartApi';

export function invalidateCartServerLinesQuery(userId: string): void {
  void queryClient.invalidateQueries({
    queryKey: cartServerQueryKeys.lines(userId),
  });
}

export async function persistUserCartLinesViaRpc(
  userId: string,
  items: Json
): Promise<void> {
  await syncCartViaRpc(userId, items);
  invalidateCartServerLinesQuery(userId);
}
