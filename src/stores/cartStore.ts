// src/stores/cartStore.ts
// Zustand store for Cart - replaces CartContext progressively

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { ProductService } from '@/services/productService';
import { Product } from '@/shared/interfaces/Iproduct.interface';
import { safeGetItem, safeSetItem, safeRemoveItem, StorageKeys, StorageTTL } from '@/lib/storage/safeStorage';
import { toast } from 'sonner';
import { getBusinessRules, initializeBusinessRules } from '@/hooks/useBusinessRules';

// Types
export interface CartItem {
  id: number;
  quantity: number;
  product: Product;
}

interface QueueOperation {
  id: string;
  type: 'ADD' | 'REMOVE' | 'UPDATE' | 'CLEAR';
  productId?: number;
  quantity?: number;
  timestamp: number;
}

interface CartState {
  // State
  items: CartItem[];
  isOnline: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  isInitialized: boolean;
  offlineQueue: QueueOperation[];
  _debouncedSave: (() => void) | null;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  
  // Sync actions
  syncNow: () => Promise<void>;
  processOfflineQueue: (userId: string) => Promise<void>;
  
  // Internal actions
  _hydrate: (items: CartItem[]) => void;
  _setOnline: (online: boolean) => void;
  _setAuthenticated: (auth: boolean) => void;
  _setInitialized: (init: boolean) => void;
  _addToQueue: (operation: Omit<QueueOperation, 'id' | 'timestamp'>) => void;
  _clearQueue: () => void;
  _loadLocalCart: () => Promise<void>;
  _loadAndMergeSupabaseCart: (userId: string) => Promise<void>;
  _saveToSupabase: (userId: string) => Promise<boolean>;
  _setDebouncedSave: (fn: () => void) => void;
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get current limits from business rules
function getCartLimits() {
  const rules = getBusinessRules();
  return {
    maxQuantityPerItem: rules.cart.maxQuantityPerItem,
    maxProductTypes: rules.cart.maxProductTypes,
    highValueThreshold: rules.cart.highValueThreshold
  };
}

// Note: MAX_CART_QUANTITY and HIGH_VALUE_ORDER_THRESHOLD are now dynamically loaded
// from business rules via useBusinessRules hook. The exports below are kept for 
// backward compatibility but components should use the hook instead.
export const MAX_CART_QUANTITY = 10; // Deprecated: use getBusinessRules().cart.maxQuantityPerItem
export const HIGH_VALUE_ORDER_THRESHOLD = 1000; // Deprecated: use getBusinessRules().cart.highValueThreshold

// Validate and sanitize quantity
function sanitizeQuantity(quantity: number): number {
  const { maxQuantityPerItem } = getCartLimits();
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.min(Math.floor(quantity), maxQuantityPerItem);
}

async function loadProductsForCartItems(items: { id: number; quantity: number }[]): Promise<CartItem[]> {
  const { maxQuantityPerItem } = getCartLimits();
  
  const cartItems = await Promise.all(
    items.map(async (item) => {
      try {
        // Validate and ENFORCE quantity limits to fix corrupted data
        let sanitizedQuantity = sanitizeQuantity(item.quantity);
        
        // Force max limit on load - this fixes old corrupted data
        if (sanitizedQuantity > maxQuantityPerItem) {
          console.warn(`Cart item ${item.id} had quantity ${item.quantity}, enforcing limit of ${maxQuantityPerItem}`);
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

// Zustand store
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
          _debouncedSave: null,

          // Actions
          addItem: (product, quantity = 1) => {
            const { maxQuantityPerItem, maxProductTypes } = getCartLimits();
            const safeQuantity = Math.min(Math.max(1, Math.floor(quantity)), maxQuantityPerItem);
            
            set((state) => {
              const existingIndex = state.items.findIndex((item) => item.id === product.id);
              
              // Check max product types limit
              if (existingIndex === -1 && state.items.length >= maxProductTypes) {
                toast.warning('Limite de produits atteinte', {
                  description: `Maximum ${maxProductTypes} produits différents dans le panier. Contactez-nous pour les commandes plus importantes.`,
                });
                return state; // Don't add the item
              }
              
              if (existingIndex > -1) {
                const newItems = [...state.items];
                const currentQty = newItems[existingIndex].quantity;
                const newQuantity = Math.min(currentQty + safeQuantity, maxQuantityPerItem);
                
                // Show message if max reached
                if (currentQty + safeQuantity > maxQuantityPerItem) {
                  toast.info('Quantité maximum atteinte', {
                    description: `Maximum ${maxQuantityPerItem} par article. Pour des commandes plus importantes, contactez-nous directement.`,
                  });
                }
                
                newItems[existingIndex] = {
                  ...newItems[existingIndex],
                  quantity: newQuantity,
                };
                return { items: newItems };
              }
              
              return {
                items: [...state.items, { id: product.id, quantity: safeQuantity, product }],
              };
            });

            // Queue for offline sync
            const { isOnline, isAuthenticated, _addToQueue } = get();
            if (!isOnline && isAuthenticated) {
              _addToQueue({ type: 'ADD', productId: product.id, quantity: safeQuantity });
            }

            // Trigger debounced save
            get()._debouncedSave?.();
          },

          removeItem: (productId) => {
            set((state) => ({
              items: state.items.filter((item) => item.id !== productId),
            }));

            const { isOnline, isAuthenticated, _addToQueue } = get();
            if (!isOnline && isAuthenticated) {
              _addToQueue({ type: 'REMOVE', productId });
            }

            get()._debouncedSave?.();
          },

          updateQuantity: (productId, quantity) => {
            const { maxQuantityPerItem } = getCartLimits();
            const safeQuantity = Math.min(Math.max(0, Math.floor(quantity)), maxQuantityPerItem);
            
            // Show message if trying to exceed max
            if (quantity > maxQuantityPerItem) {
              toast.info('Quantité maximum atteinte', {
                description: `Maximum ${maxQuantityPerItem} par article. Pour des commandes plus importantes, contactez-nous directement.`,
              });
            }
            
            set((state) => {
              if (safeQuantity <= 0) {
                return { items: state.items.filter((item) => item.id !== productId) };
              }
              return {
                items: state.items.map((item) =>
                  item.id === productId ? { ...item, quantity: safeQuantity } : item
                ),
              };
            });

            const { isOnline, isAuthenticated, _addToQueue } = get();
            if (!isOnline && isAuthenticated) {
              _addToQueue({ type: 'UPDATE', productId, quantity: safeQuantity });
            }

            get()._debouncedSave?.();
          },

          clearCart: () => {
            set({ items: [] });

            const { isOnline, isAuthenticated, _addToQueue } = get();
            if (!isOnline && isAuthenticated) {
              _addToQueue({ type: 'CLEAR' });
            }

            get()._debouncedSave?.();
          },

          // Sync actions
          syncNow: async () => {
            const { isOnline, items } = get();
            
            if (!isOnline) {
              toast.error('Synchronisation impossible', {
                description: 'Vous êtes actuellement hors-ligne',
              });
              return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              set({ isSyncing: true });
              try {
                await get()._saveToSupabase(user.id);
                get()._clearQueue();
                toast.success('Panier synchronisé');
              } finally {
                set({ isSyncing: false });
              }
            }
          },

          processOfflineQueue: async (userId) => {
            const { offlineQueue, _clearQueue } = get();
            if (offlineQueue.length === 0) return;

            set({ isSyncing: true });
            const sortedQueue = [...offlineQueue].sort((a, b) => a.timestamp - b.timestamp);
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

            if (failedOps.length > 0) {
              set({ offlineQueue: failedOps });
              toast.warning('Synchronisation partielle', {
                description: `${successCount}/${sortedQueue.length} opération(s) synchronisée(s)`,
              });
            } else {
              _clearQueue();
              toast.success('Panier synchronisé', {
                description: `${successCount} opération(s) synchronisée(s)`,
              });
            }

            set({ isSyncing: false });
          },

          // Internal actions
          _hydrate: (items) => set({ items }),

          _setOnline: (online) => set({ isOnline: online }),

          _setAuthenticated: (auth) => set({ isAuthenticated: auth }),

          _setInitialized: (init) => set({ isInitialized: init }),

          _addToQueue: (operation) => {
            set((state) => ({
              offlineQueue: [
                ...state.offlineQueue,
                { ...operation, id: generateId(), timestamp: Date.now() },
              ],
            }));
          },

          _clearQueue: () => {
            set({ offlineQueue: [] });
            safeRemoveItem(StorageKeys.CART_OFFLINE_QUEUE);
          },

          _setDebouncedSave: (fn) => set({ _debouncedSave: fn }),

          _loadLocalCart: async () => {
            const savedCart = safeGetItem<{ items: Array<{ id: number; quantity: number }> } | Array<{ id: number; quantity: number }>>(StorageKeys.CART);
            if (!savedCart) return;

            const items = Array.isArray(savedCart) ? savedCart : savedCart?.items || [];
            if (items.length === 0) return;

            const cartItems = await loadProductsForCartItems(items);
            if (cartItems.length > 0) {
              set({ items: cartItems });
            }
          },

          _loadAndMergeSupabaseCart: async (userId) => {
            const { isOnline, items: localItems, _loadLocalCart } = get();
            
            set({ isSyncing: true });
            
            try {
              // First load local cart if not already loaded
              if (localItems.length === 0) {
                await _loadLocalCart();
              }
              
              if (!isOnline) {
                set({ isSyncing: false });
                return;
              }

              // Load Supabase cart
              const { data, error } = await supabase
                .from('cart_items')
                .select('product_id, quantity')
                .eq('user_id', userId);

              if (error) throw error;

              const supabaseItems = data ? await loadProductsForCartItems(
                data.map((item) => ({ id: item.product_id as number, quantity: item.quantity }))
              ) : [];

              // Merge carts - use MAX quantity, not ADD (to prevent quantity inflation)
              const { maxQuantityPerItem } = getCartLimits();
              const mergedMap = new Map<number, CartItem>();
              
              supabaseItems.forEach((item) => mergedMap.set(item.id, item));
              
              const currentItems = get().items;
              let hasNewItems = false;
              currentItems.forEach((item) => {
                const existing = mergedMap.get(item.id);
                if (existing) {
                  // Take MAX, not ADD, to prevent quantity inflation bug
                  existing.quantity = Math.min(
                    Math.max(existing.quantity, item.quantity),
                    maxQuantityPerItem
                  );
                } else {
                  // Cap new items at max limit
                  item.quantity = Math.min(item.quantity, maxQuantityPerItem);
                  mergedMap.set(item.id, item);
                  hasNewItems = true;
                }
              });

              // Ensure all merged items respect max quantity limit
              const mergedItems = Array.from(mergedMap.values()).map(item => ({
                ...item,
                quantity: Math.min(item.quantity, maxQuantityPerItem)
              }));
              set({ items: mergedItems });

              // Save merged cart
              if (mergedItems.length > 0) {
                await get()._saveToSupabase(userId);
                safeRemoveItem(StorageKeys.CART);
                
                if (hasNewItems && currentItems.length > 0) {
                  toast.success('Votre panier local a été synchronisé');
                }
              }
            } catch (error) {
              console.error('Error merging carts:', error);
            } finally {
              set({ isSyncing: false });
            }
          },

          _saveToSupabase: async (userId) => {
            const { isOnline, items } = get();
            
            if (!isOnline) {
              safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
              return false;
            }

            try {
              // Clear existing
              await supabase.from('cart_items').delete().eq('user_id', userId);

              // Insert new
              if (items.length > 0) {
                const { error } = await supabase.from('cart_items').insert(
                  items.map((item) => ({
                    user_id: userId,
                    product_id: item.id,
                    quantity: item.quantity,
                  }))
                );
                if (error) throw error;
              }

              return true;
            } catch (error) {
              console.error('Failed to save to Supabase:', error);
              safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
              return false;
            }
          },
        }),
        {
          name: 'cart-storage',
          partialize: (state) => ({
            items: state.items.map((item) => ({ id: item.id, quantity: item.quantity })),
            offlineQueue: state.offlineQueue,
          }),
          // Custom storage using safeStorage
          storage: {
            getItem: (name) => {
              const data = safeGetItem<{ state: unknown; version: number }>(name as keyof typeof StorageKeys);
              return data || null;
            },
            setItem: (name, value) => {
              safeSetItem(name as keyof typeof StorageKeys, value, { ttl: StorageTTL.WEEK });
            },
            removeItem: (name) => {
              safeRemoveItem(name as keyof typeof StorageKeys);
            },
          },
          // On rehydration, load products for stored items
          onRehydrateStorage: () => {
            return async (state, error) => {
              if (error) {
                console.error('Cart rehydration error:', error);
                return;
              }
              
              if (state && state.items && state.items.length > 0) {
                // Check if items need product data loaded
                const itemsNeedingProducts = state.items.filter(item => !item.product);
                
                if (itemsNeedingProducts.length > 0) {
                  console.log('Rehydrating cart: loading products for', itemsNeedingProducts.length, 'items');
                  
                  try {
                    const reloadedItems = await loadProductsForCartItems(
                      itemsNeedingProducts.map(item => ({ id: item.id, quantity: item.quantity }))
                    );
                    
                    // Merge with any items that already had product data
                    const existingValidItems = state.items.filter(item => item.product);
                    const mergedItems = [...existingValidItems, ...reloadedItems];
                    
                    useCartStore.setState({ items: mergedItems });
                  } catch (err) {
                    console.error('Failed to reload products during rehydration:', err);
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

// Selectors (optimized re-renders)
// CRITICAL: Selectors must filter out items without valid product data
export const selectCartItems = (state: CartState) => 
  state.items.filter(item => item?.product?.id != null);
export const selectItemCount = (state: CartState) => 
  state.items.filter(item => item?.product?.id != null).reduce((sum, item) => sum + item.quantity, 0);
export const selectTotalPrice = (state: CartState) =>
  state.items.filter(item => item?.product?.id != null).reduce((sum, item) => sum + item.product.price * item.quantity, 0);
export const selectIsInCart = (productId: number) => (state: CartState) =>
  state.items.some((item) => item.id === productId && item?.product?.id != null);
export const selectPendingOperations = (state: CartState) => state.offlineQueue.length;

// Initialize store (call once in app)
let initialized = false;
let saveTimeout: NodeJS.Timeout | null = null;

export function initializeCartStore() {
  if (initialized) return;
  initialized = true;

  const store = useCartStore.getState();

  // Debounced save function
  const debouncedSave = async () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
      const { isOnline, items, isInitialized } = useCartStore.getState();
      if (!isInitialized) return;

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && isOnline) {
        await useCartStore.getState()._saveToSupabase(user.id);
      } else {
        safeSetItem(StorageKeys.CART, { items }, { ttl: StorageTTL.WEEK });
      }
    }, 500);
  };

  // Attach debounced save via proper setter
  useCartStore.getState()._setDebouncedSave(debouncedSave);

  // Online/offline listeners
  window.addEventListener('online', () => {
    useCartStore.setState({ isOnline: true });
    toast.success('Connexion rétablie');
    
    // Process queue if authenticated
    const { isAuthenticated, offlineQueue, processOfflineQueue } = useCartStore.getState();
    if (isAuthenticated && offlineQueue.length > 0) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) processOfflineQueue(user.id);
      });
    }
  });

  window.addEventListener('offline', () => {
    useCartStore.setState({ isOnline: false });
    toast.warning('Mode hors-ligne');
  });

  // Auth state listener
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      useCartStore.setState({ isAuthenticated: true });
      setTimeout(() => {
        useCartStore.getState()._loadAndMergeSupabaseCart(session.user.id);
      }, 0);
    } else if (event === 'SIGNED_OUT') {
      useCartStore.setState({ 
        isAuthenticated: false, 
        items: [],
        isInitialized: false 
      });
      safeRemoveItem(StorageKeys.CART);
      useCartStore.getState()._clearQueue();
    }
  });

  // Initial load
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      useCartStore.setState({ isAuthenticated: true });
      await useCartStore.getState()._loadAndMergeSupabaseCart(user.id);
    } else {
      await useCartStore.getState()._loadLocalCart();
    }
    
    useCartStore.setState({ isInitialized: true });
  })();
}

// Compatibility hook (same API as useCart)
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

  // CRITICAL FIX: Only count items that have valid product data
  // Items may be hydrated from localStorage without product objects
  const validItems = rawItems.filter(item => item?.product?.id != null);
  
  const itemCount = validItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = validItems.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0);

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
    // Legacy dispatch (for gradual migration)
    dispatch: () => console.warn('dispatch is deprecated, use direct actions'),
  };
}
