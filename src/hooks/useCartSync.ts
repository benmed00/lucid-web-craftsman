// src/hooks/useCartSync.ts
// Dedicated hook for cart synchronization logic - extracted from cartStore

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductService } from '@/services/productService';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  StorageKeys,
  StorageTTL,
} from '@/lib/storage/safeStorage';
import { toast } from 'sonner';
import { getBusinessRules } from '@/hooks/useBusinessRules';

// Types
export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

export interface QueueOperation {
  id: string;
  type: 'ADD' | 'REMOVE' | 'UPDATE' | 'CLEAR';
  productId?: number;
  quantity?: number;
  timestamp: number;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  offlineQueue: QueueOperation[];
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCartLimits() {
  const rules = getBusinessRules();
  return {
    maxQuantityPerItem: rules.cart.maxQuantityPerItem,
    maxProductTypes: rules.cart.maxProductTypes,
  };
}

function sanitizeQuantity(quantity: number): number {
  const { maxQuantityPerItem } = getCartLimits();
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(Math.floor(quantity), maxQuantityPerItem);
}

// Load product data for cart items
export async function loadProductsForCartItems(
  items: { id: number; quantity: number }[]
): Promise<CartItem[]> {
  if (items.length === 0) return [];
  const { maxQuantityPerItem } = getCartLimits();

  try {
    // Single batch query instead of N individual queries
    const productMap = await ProductService.getProductsByIds(
      items.map((i) => i.id)
    );

    const cartItems: CartItem[] = [];
    for (const item of items) {
      let sanitizedQuantity = sanitizeQuantity(item.quantity);

      if (sanitizedQuantity > maxQuantityPerItem) {
        console.warn(
          `Cart item ${item.id} had quantity ${item.quantity}, enforcing limit of ${maxQuantityPerItem}`
        );
        sanitizedQuantity = maxQuantityPerItem;
      }

      if (sanitizedQuantity <= 0) {
        console.warn(
          `Skipping cart item ${item.id} with invalid quantity:`,
          item.quantity
        );
        continue;
      }

      const product = productMap.get(item.id);
      if (product) {
        cartItems.push({ id: item.id, quantity: sanitizedQuantity, product });
      }
    }
    return cartItems;
  } catch (error) {
    console.error('Error batch-loading products for cart:', error);
    return [];
  }
}

// Load cart from local storage
export async function loadLocalCart(): Promise<CartItem[]> {
  const savedCart = safeGetItem<
    | { items: Array<{ id: number; quantity: number }> }
    | Array<{ id: number; quantity: number }>
  >(StorageKeys.CART);

  if (!savedCart) return [];

  const items = Array.isArray(savedCart) ? savedCart : savedCart?.items || [];
  if (items.length === 0) return [];

  return loadProductsForCartItems(items);
}

// Load and merge cart from Supabase
export async function loadAndMergeSupabaseCart(
  userId: string,
  localItems: CartItem[]
): Promise<CartItem[]> {
  if (!userId) return localItems;

  const { maxQuantityPerItem } = getCartLimits();

  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId);

  if (error) throw error;

  const supabaseItems = data
    ? await loadProductsForCartItems(
        data.map((item) => ({
          id: item.product_id as number,
          quantity: item.quantity,
        }))
      )
    : [];

  // Merge carts - use MAX quantity (not ADD to prevent inflation)
  const mergedMap = new Map<number, CartItem>();

  supabaseItems.forEach((item) => mergedMap.set(item.id, item));

  localItems.forEach((item) => {
    const existing = mergedMap.get(item.id);
    if (existing) {
      existing.quantity = Math.min(
        Math.max(existing.quantity, item.quantity),
        maxQuantityPerItem
      );
    } else {
      item.quantity = Math.min(item.quantity, maxQuantityPerItem);
      mergedMap.set(item.id, item);
    }
  });

  return Array.from(mergedMap.values()).map((item) => ({
    ...item,
    quantity: Math.min(item.quantity, maxQuantityPerItem),
  }));
}

// Save cart to Supabase using atomic RPC
export async function saveToSupabase(
  userId: string,
  items: CartItem[],
  isOnline: boolean
): Promise<boolean> {
  if (!userId) {
    console.warn('[CartSync] Skipping Supabase sync: missing userId');
    safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
    return false;
  }

  if (!isOnline) {
    safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
    return false;
  }

  try {
    const sanitizedItems = items
      .filter((item) => Number.isFinite(item.id))
      .map((item) => ({
        product_id: item.id,
        quantity: Math.max(0, Math.floor(item.quantity)),
      }))
      .filter((item) => item.quantity > 0);

    // Single atomic RPC call — no race conditions
    const { error } = await supabase.rpc('sync_cart', {
      p_user_id: userId,
      p_items: sanitizedItems,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
    return false;
  }
}

// ============= Offline Queue Constants =============
const MAX_QUEUE_SIZE = 50;
const MAX_RETRIES_PER_OP = 3;

/**
 * Deduplicate queue: collapse sequential operations on the same product.
 * ADD→UPDATE = UPDATE, UPDATE→UPDATE = latest UPDATE, ADD→REMOVE = remove both.
 */
function deduplicateQueue(queue: QueueOperation[]): QueueOperation[] {
  const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  const productState = new Map<number | undefined, QueueOperation>();

  for (const op of sorted) {
    if (op.type === 'CLEAR') {
      // CLEAR supersedes everything
      productState.clear();
      productState.set(undefined, op);
      continue;
    }

    const key = op.productId;
    const existing = productState.get(key);

    if (!existing) {
      productState.set(key, op);
      continue;
    }

    // Collapse: later op wins for same product
    if (op.type === 'REMOVE') {
      // If we had an ADD, just remove both (net zero)
      if (existing.type === 'ADD') {
        productState.delete(key);
      } else {
        productState.set(key, op);
      }
    } else {
      // ADD or UPDATE — latest quantity wins
      productState.set(key, op);
    }
  }

  return Array.from(productState.values());
}

// Process offline queue with deduplication, size limits, and backoff
export async function processOfflineQueue(
  userId: string,
  queue: QueueOperation[]
): Promise<{ success: number; failed: QueueOperation[] }> {
  if (queue.length === 0) return { success: 0, failed: [] };

  // Deduplicate before processing
  const deduped = deduplicateQueue(queue);
  let successCount = 0;
  const failedOps: QueueOperation[] = [];

  for (const op of deduped) {
    let attempt = 0;
    let succeeded = false;

    while (attempt < MAX_RETRIES_PER_OP && !succeeded) {
      try {
        switch (op.type) {
          case 'ADD':
            if (op.productId && op.quantity) {
              await supabase.from('cart_items').upsert(
                {
                  user_id: userId,
                  product_id: op.productId,
                  quantity: op.quantity,
                },
                { onConflict: 'user_id,product_id' }
              );
              succeeded = true;
            }
            break;

          case 'REMOVE':
            if (op.productId) {
              await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', userId)
                .eq('product_id', op.productId);
              succeeded = true;
            }
            break;

          case 'UPDATE':
            if (op.productId && op.quantity !== undefined) {
              if (op.quantity <= 0) {
                await supabase
                  .from('cart_items')
                  .delete()
                  .eq('user_id', userId)
                  .eq('product_id', op.productId);
              } else {
                await supabase.from('cart_items').upsert(
                  {
                    user_id: userId,
                    product_id: op.productId,
                    quantity: op.quantity,
                  },
                  { onConflict: 'user_id,product_id' }
                );
              }
              succeeded = true;
            }
            break;

          case 'CLEAR':
            await supabase.from('cart_items').delete().eq('user_id', userId);
            succeeded = true;
            break;
        }
      } catch (error) {
        attempt++;
        if (attempt < MAX_RETRIES_PER_OP) {
          // Exponential backoff: 500ms, 1500ms, 3500ms
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }

    if (succeeded) {
      successCount++;
    } else {
      failedOps.push(op);
    }
  }

  return { success: successCount, failed: failedOps };
}

// Create a queue operation
export function createQueueOperation(
  operation: Omit<QueueOperation, 'id' | 'timestamp'>
): QueueOperation {
  return {
    ...operation,
    id: generateId(),
    timestamp: Date.now(),
  };
}

// Hook for managing cart sync state and listeners
export function useCartSyncListeners(
  onOnlineChange: (online: boolean) => void,
  onAuthChange: (userId: string | null) => void
) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Online/offline listeners
    const handleOnline = () => {
      onOnlineChange(true);
      toast.success('Connexion rétablie');
    };

    const handleOffline = () => {
      onOnlineChange(false);
      toast.warning('Mode hors-ligne');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        onAuthChange(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        onAuthChange(null);
      }
    });

    cleanupRef.current = () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
    };

    return () => cleanupRef.current?.();
  }, [onOnlineChange, onAuthChange]);
}

// Debounced save hook
export function useDebouncedCartSave(
  items: CartItem[],
  isOnline: boolean,
  isInitialized: boolean,
  delay = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const save = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      if (!isInitialized) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isOnline) {
        await saveToSupabase(user.id, itemsRef.current, isOnline);
      } else {
        safeSetItem(
          StorageKeys.CART,
          { items: itemsRef.current },
          { ttl: StorageTTL.WEEK }
        );
      }
    }, delay);
  }, [isOnline, isInitialized, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return save;
}
