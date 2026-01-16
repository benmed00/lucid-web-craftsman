// src/hooks/useCartSync.ts
// Dedicated hook for cart synchronization logic - extracted from cartStore

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProductService } from '@/services/productService';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { safeGetItem, safeSetItem, safeRemoveItem, StorageKeys, StorageTTL } from '@/lib/storage/safeStorage';
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
  const { maxQuantityPerItem } = getCartLimits();

  const cartItems = await Promise.all(
    items.map(async (item) => {
      try {
        let sanitizedQuantity = sanitizeQuantity(item.quantity);

        if (sanitizedQuantity > maxQuantityPerItem) {
          console.warn(
            `Cart item ${item.id} had quantity ${item.quantity}, enforcing limit of ${maxQuantityPerItem}`
          );
          sanitizedQuantity = maxQuantityPerItem;
        }

        if (sanitizedQuantity <= 0) {
          console.warn(`Skipping cart item ${item.id} with invalid quantity:`, item.quantity);
          return null;
        }

        const product = await ProductService.getProductById(item.id);
        if (product) {
          return { id: item.id, quantity: sanitizedQuantity, product };
        }
        return null;
      } catch (error) {
        console.error(`Error loading product ${item.id}:`, error);
        return null;
      }
    })
  );
  return cartItems.filter((item): item is CartItem => item !== null);
}

// Load cart from local storage
export async function loadLocalCart(): Promise<CartItem[]> {
  const savedCart = safeGetItem<
    { items: Array<{ id: number; quantity: number }> } | Array<{ id: number; quantity: number }>
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
  const { maxQuantityPerItem } = getCartLimits();

  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId);

  if (error) throw error;

  const supabaseItems = data
    ? await loadProductsForCartItems(
        data.map((item) => ({ id: item.product_id as number, quantity: item.quantity }))
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

// Save cart to Supabase
export async function saveToSupabase(
  userId: string,
  items: CartItem[],
  isOnline: boolean
): Promise<boolean> {
  if (!isOnline) {
    safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
    return false;
  }

  try {
    // Get current cart items from Supabase
    const { data: existingItems } = await supabase
      .from('cart_items')
      .select('product_id')
      .eq('user_id', userId);

    const existingProductIds = new Set((existingItems || []).map((i) => i.product_id));
    const currentProductIds = new Set(items.map((i) => i.id));

    // Delete items no longer in cart
    const toDelete = [...existingProductIds].filter((id) => !currentProductIds.has(id));
    if (toDelete.length > 0) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .in('product_id', toDelete);
    }

    // Upsert current items
    if (items.length > 0) {
      const { error } = await supabase.from('cart_items').upsert(
        items.map((item) => ({
          user_id: userId,
          product_id: item.id,
          quantity: item.quantity,
        })),
        { onConflict: 'user_id,product_id' }
      );
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
    return false;
  }
}

// Process offline queue
export async function processOfflineQueue(
  userId: string,
  queue: QueueOperation[]
): Promise<{ success: number; failed: QueueOperation[] }> {
  if (queue.length === 0) return { success: 0, failed: [] };

  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  let successCount = 0;
  const failedOps: QueueOperation[] = [];

  for (const op of sortedQueue) {
    try {
      switch (op.type) {
        case 'ADD':
          if (op.productId && op.quantity) {
            const { data: existing } = await supabase
              .from('cart_items')
              .select('quantity')
              .eq('user_id', userId)
              .eq('product_id', op.productId)
              .single();

            if (existing) {
              await supabase
                .from('cart_items')
                .update({ quantity: existing.quantity + op.quantity })
                .eq('user_id', userId)
                .eq('product_id', op.productId);
            } else {
              await supabase
                .from('cart_items')
                .insert({ user_id: userId, product_id: op.productId, quantity: op.quantity });
            }
            successCount++;
          }
          break;

        case 'REMOVE':
          if (op.productId) {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', userId)
              .eq('product_id', op.productId);
            successCount++;
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
              await supabase
                .from('cart_items')
                .update({ quantity: op.quantity })
                .eq('user_id', userId)
                .eq('product_id', op.productId);
            }
            successCount++;
          }
          break;

        case 'CLEAR':
          await supabase.from('cart_items').delete().eq('user_id', userId);
          successCount++;
          break;
      }
    } catch (error) {
      console.error(`Failed operation ${op.id}:`, error);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

      const { data: { user } } = await supabase.auth.getUser();

      if (user && isOnline) {
        await saveToSupabase(user.id, itemsRef.current, isOnline);
      } else {
        safeSetItem(StorageKeys.CART, { items: itemsRef.current }, { ttl: StorageTTL.WEEK });
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
