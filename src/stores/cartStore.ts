// src/stores/cartStore.ts
// Zustand store for Cart - simplified with sync logic extracted to useCartSync

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
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
import {
  CartItem,
  QueueOperation,
  loadProductsForCartItems,
  loadLocalCart,
  loadAndMergeSupabaseCart,
  saveToSupabase,
  processOfflineQueue,
  createQueueOperation,
} from '@/hooks/useCartSync';

// Re-export types
export type { CartItem, QueueOperation };

// Deprecated constants - use getBusinessRules() instead
export const MAX_CART_QUANTITY = 10;
export const HIGH_VALUE_ORDER_THRESHOLD = 1000;

// Get current limits from business rules
function getCartLimits() {
  const rules = getBusinessRules();
  return {
    maxQuantityPerItem: rules.cart.maxQuantityPerItem,
    maxProductTypes: rules.cart.maxProductTypes,
    highValueThreshold: rules.cart.highValueThreshold,
  };
}

interface CartState {
  // State
  items: CartItem[];
  isOnline: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  isInitialized: boolean;
  offlineQueue: QueueOperation[];

  // Cart actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  // Sync actions
  syncNow: () => Promise<void>;
  triggerSave: () => void;

  // Internal actions
  _setOnline: (online: boolean) => void;
  _setAuthenticated: (auth: boolean) => void;
  _setItems: (items: CartItem[]) => void;
  _setSyncing: (syncing: boolean) => void;
  _setInitialized: (init: boolean) => void;
  _addToQueue: (operation: Omit<QueueOperation, 'id' | 'timestamp'>) => void;
  _clearQueue: () => void;
}

// Zustand store - simplified
export const useCartStore = create<CartState>()(
  devtools(
    subscribeWithSelector(
      persist(
        (set, get) => ({
          // Initial state
          items: [],
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          isAuthenticated: false,
          isSyncing: false,
          isInitialized: false,
          offlineQueue: [],

          // Cart actions
          addItem: (product, quantity = 1) => {
            const { maxQuantityPerItem, maxProductTypes } = getCartLimits();
            const safeQuantity = Math.min(
              Math.max(1, Math.floor(quantity)),
              maxQuantityPerItem
            );

            set((state) => {
              const existingIndex = state.items.findIndex(
                (item) => item.id === product.id
              );

              if (
                existingIndex === -1 &&
                state.items.length >= maxProductTypes
              ) {
                toast.warning('Limite de produits atteinte', {
                  description: `Maximum ${maxProductTypes} produits différents dans le panier.`,
                });
                return state;
              }

              if (existingIndex > -1) {
                const newItems = [...state.items];
                const currentQty = newItems[existingIndex].quantity;
                const newQuantity = Math.min(
                  currentQty + safeQuantity,
                  maxQuantityPerItem
                );

                if (currentQty + safeQuantity > maxQuantityPerItem) {
                  toast.info('Quantité maximum atteinte', {
                    description: `Maximum ${maxQuantityPerItem} par article.`,
                  });
                }

                newItems[existingIndex] = {
                  ...newItems[existingIndex],
                  quantity: newQuantity,
                };
                return { items: newItems };
              }

              return {
                items: [
                  ...state.items,
                  { id: product.id, quantity: safeQuantity, product },
                ],
              };
            });

            const { isOnline, isAuthenticated } = get();
            if (!isOnline && isAuthenticated) {
              get()._addToQueue({
                type: 'ADD',
                productId: product.id,
                quantity: safeQuantity,
              });
            }

            get().triggerSave();
          },

          removeItem: (productId) => {
            set((state) => ({
              items: state.items.filter((item) => item.id !== productId),
            }));

            const { isOnline, isAuthenticated } = get();
            if (!isOnline && isAuthenticated) {
              get()._addToQueue({ type: 'REMOVE', productId });
            }

            get().triggerSave();
          },

          updateQuantity: (productId, quantity) => {
            const { maxQuantityPerItem } = getCartLimits();
            const safeQuantity = Math.min(
              Math.max(0, Math.floor(quantity)),
              maxQuantityPerItem
            );

            if (quantity > maxQuantityPerItem) {
              toast.info('Quantité maximum atteinte', {
                description: `Maximum ${maxQuantityPerItem} par article.`,
              });
            }

            set((state) => {
              if (safeQuantity <= 0) {
                return {
                  items: state.items.filter((item) => item.id !== productId),
                };
              }
              return {
                items: state.items.map((item) =>
                  item.id === productId
                    ? { ...item, quantity: safeQuantity }
                    : item
                ),
              };
            });

            const { isOnline, isAuthenticated } = get();
            if (!isOnline && isAuthenticated) {
              get()._addToQueue({
                type: 'UPDATE',
                productId,
                quantity: safeQuantity,
              });
            }

            get().triggerSave();
          },

          clearCart: () => {
            set({ items: [] });

            const { isOnline, isAuthenticated } = get();
            if (!isOnline && isAuthenticated) {
              get()._addToQueue({ type: 'CLEAR' });
            }

            get().triggerSave();
          },

          // Sync actions
          syncNow: async () => {
            const { isOnline, items, offlineQueue } = get();

            if (!isOnline) {
              toast.error('Synchronisation impossible', {
                description: 'Vous êtes actuellement hors-ligne',
              });
              return;
            }

            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            set({ isSyncing: true });
            try {
              // Process offline queue first
              if (offlineQueue.length > 0) {
                const { success, failed } = await processOfflineQueue(
                  user.id,
                  offlineQueue
                );
                if (failed.length > 0) {
                  set({ offlineQueue: failed });
                  toast.warning('Synchronisation partielle', {
                    description: `${success}/${offlineQueue.length} opération(s) synchronisée(s)`,
                  });
                } else {
                  get()._clearQueue();
                }
              }

              await saveToSupabase(user.id, items, isOnline);
              toast.success('Panier synchronisé');
            } finally {
              set({ isSyncing: false });
            }
          },

          triggerSave: () => {
            // Will be set by initializeCartStore
          },

          // Internal actions
          _setOnline: (online) => set({ isOnline: online }),
          _setAuthenticated: (auth) => set({ isAuthenticated: auth }),
          _setItems: (items) => set({ items }),
          _setSyncing: (syncing) => set({ isSyncing: syncing }),
          _setInitialized: (init) => set({ isInitialized: init }),

          _addToQueue: (operation) => {
            set((state) => ({
              offlineQueue: [
                ...state.offlineQueue,
                createQueueOperation(operation),
              ],
            }));
          },

          _clearQueue: () => {
            set({ offlineQueue: [] });
            safeRemoveItem(StorageKeys.CART_OFFLINE_QUEUE);
          },
        }),
        {
          name: 'cart-storage',
          partialize: (state) => ({
            items: state.items.map((item) => ({
              id: item.id,
              quantity: item.quantity,
            })),
            offlineQueue: state.offlineQueue,
          }),
          storage: {
            getItem: (name) => {
              const data = safeGetItem<{ state: unknown; version: number }>(
                name as keyof typeof StorageKeys
              );
              return data || null;
            },
            setItem: (name, value) => {
              safeSetItem(name as keyof typeof StorageKeys, value, {
                ttl: StorageTTL.WEEK,
              });
            },
            removeItem: (name) => {
              safeRemoveItem(name as keyof typeof StorageKeys);
            },
          },
          onRehydrateStorage: () => {
            return async (state, error) => {
              if (error) {
                console.error('Cart rehydration error:', error);
                return;
              }

              if (state?.items?.length > 0) {
                const itemsNeedingProducts = state.items.filter(
                  (item) => !item.product
                );

                if (itemsNeedingProducts.length > 0) {
                  try {
                    const reloadedItems = await loadProductsForCartItems(
                      itemsNeedingProducts.map((item) => ({
                        id: item.id,
                        quantity: item.quantity,
                      }))
                    );
                    const existingValidItems = state.items.filter(
                      (item) => item.product
                    );
                    useCartStore.setState({
                      items: [...existingValidItems, ...reloadedItems],
                    });
                  } catch (err) {
                    console.error(
                      'Failed to reload products during rehydration:',
                      err
                    );
                  }
                }
              }
            };
          },
        }
      )
    ),
    { name: 'CartStore' }
  )
);

// Selectors
export const selectCartItems = (state: CartState) =>
  state.items.filter((item) => item?.product?.id != null);
export const selectItemCount = (state: CartState) =>
  state.items
    .filter((item) => item?.product?.id != null)
    .reduce((sum, item) => sum + item.quantity, 0);
export const selectTotalPrice = (state: CartState) =>
  state.items
    .filter((item) => item?.product?.id != null)
    .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
export const selectIsInCart = (productId: number) => (state: CartState) =>
  state.items.some(
    (item) => item.id === productId && item?.product?.id != null
  );
export const selectPendingOperations = (state: CartState) =>
  state.offlineQueue.length;

// Initialize store
let initialized = false;
let saveTimeout: NodeJS.Timeout | null = null;

export function initializeCartStore() {
  if (initialized) return;
  initialized = true;

  // --- BroadcastChannel: sync cart across tabs ---
  let cartChannel: BroadcastChannel | null = null;
  let ignoreNextBroadcast = false;

  try {
    cartChannel = new BroadcastChannel('cart-sync');
    cartChannel.onmessage = (event) => {
      if (
        event.data?.type === 'CART_UPDATE' &&
        Array.isArray(event.data.items)
      ) {
        ignoreNextBroadcast = true;
        useCartStore.setState({ items: event.data.items });
      }
    };
  } catch {
    // BroadcastChannel not supported (e.g., older browsers) — silent fallback
  }

  function broadcastCartUpdate(items: CartItem[]) {
    if (ignoreNextBroadcast) {
      ignoreNextBroadcast = false;
      return;
    }
    try {
      cartChannel?.postMessage({ type: 'CART_UPDATE', items });
    } catch {
      // Ignore broadcast errors
    }
  }

  // Subscribe to cart item changes and broadcast
  useCartStore.subscribe(
    (state) => state.items,
    (items) => broadcastCartUpdate(items)
  );

  // Debounced save function
  const debouncedSave = async () => {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
      const { isOnline, items, isInitialized } = useCartStore.getState();
      if (!isInitialized) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && isOnline) {
        await saveToSupabase(user.id, items, isOnline);
      } else {
        safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
      }
    }, 500);
  };

  // Attach debounced save
  useCartStore.setState({ triggerSave: debouncedSave } as Partial<CartState>);

  // Online/offline listeners
  window.addEventListener('online', () => {
    useCartStore.setState({ isOnline: true });
    toast.success('Connexion rétablie');

    const { isAuthenticated, offlineQueue } = useCartStore.getState();
    if (isAuthenticated && offlineQueue.length > 0) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          processOfflineQueue(user.id, offlineQueue).then(({ failed }) => {
            if (failed.length === 0) {
              useCartStore.getState()._clearQueue();
              toast.success('Panier synchronisé');
            }
          });
        }
      });
    }
  });

  window.addEventListener('offline', () => {
    useCartStore.setState({ isOnline: false });
    toast.warning('Mode hors-ligne');
  });

  // Auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      useCartStore.setState({ isAuthenticated: true, isSyncing: true });

      try {
        const localItems = useCartStore.getState().items;
        const mergedItems = await loadAndMergeSupabaseCart(
          session.user.id,
          localItems
        );
        useCartStore.setState({ items: mergedItems });

        if (mergedItems.length > 0) {
          await saveToSupabase(session.user.id, mergedItems, true);
          safeRemoveItem(StorageKeys.CART);
        }
      } finally {
        useCartStore.setState({ isSyncing: false });
      }
    } else if (event === 'SIGNED_OUT') {
      useCartStore.setState({
        isAuthenticated: false,
        items: [],
        isInitialized: false,
      });
      safeRemoveItem(StorageKeys.CART);
      useCartStore.getState()._clearQueue();
    }
  });

  // Initial load
  (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      useCartStore.setState({ isAuthenticated: true, isSyncing: true });
      try {
        const localItems = await loadLocalCart();
        const mergedItems = await loadAndMergeSupabaseCart(user.id, localItems);
        useCartStore.setState({ items: mergedItems });

        if (mergedItems.length > 0) {
          await saveToSupabase(user.id, mergedItems, true);
          safeRemoveItem(StorageKeys.CART);
        }
      } finally {
        useCartStore.setState({ isSyncing: false });
      }
    } else {
      const localItems = await loadLocalCart();
      if (localItems.length > 0) {
        useCartStore.setState({ items: localItems });
      }
    }

    useCartStore.setState({ isInitialized: true });
  })();
}

// Compatibility hook
export function useCart() {
  const rawItems = useCartStore((state) => state.items);
  const isOnline = useCartStore((state) => state.isOnline);
  const isAuthenticated = useCartStore((state) => state.isAuthenticated);
  const isSyncing = useCartStore((state) => state.isSyncing);
  const offlineQueue = useCartStore((state) => state.offlineQueue);

  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const syncNow = useCartStore((state) => state.syncNow);

  const validItems = rawItems.filter((item) => item?.product?.id != null);
  const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = validItems.reduce(
    (sum, item) => sum + (item.product.price ?? 0) * item.quantity,
    0
  );

  return {
    cart: { items: validItems, totalPrice },
    items: validItems,
    itemCount,
    totalPrice,
    isOnline,
    isAuthenticated,
    isSyncing,
    pendingOperations: offlineQueue.length,
    addItem,
    removeItem,
    updateItemQuantity: updateQuantity,
    clearCart,
    syncNow,
    dispatch: () => console.warn('dispatch is deprecated, use direct actions'),
  };
}
