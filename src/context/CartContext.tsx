// src/context/CartContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductService } from "@/services/productService";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { toast } from "sonner";

// Types
export type CartItem = {
  id: number;
  quantity: number;
  product: Product;
};

export type CartState = {
  items: CartItem[];
  totalPrice: number;
};

export type CartAction =
  | { type: "ADD_ITEM"; payload: Product; quantity: number }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_ITEM_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartState };

// Offline queue operation types
type QueueOperation = {
  id: string;
  type: "ADD" | "REMOVE" | "UPDATE" | "CLEAR";
  productId?: number;
  quantity?: number;
  timestamp: number;
};

// Context type
interface CartContextType {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
  itemCount: number;
  totalPrice: number;
  clearCart: () => void;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (itemId: number) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  isSyncing: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  pendingOperations: number;
  syncNow: () => Promise<void>;
}

// Create context
export const CartContext = createContext<CartContextType | undefined>(undefined);

// useCart hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      let newItems;
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.quantity }
            : item
        );
      } else {
        newItems = [
          ...state.items,
          {
            id: action.payload.id,
            quantity: action.quantity,
            product: action.payload,
          },
        ];
      }
      return { ...state, items: newItems };
    }
    case "REMOVE_ITEM": {
      const newItems = state.items.filter((item) => item.id !== action.payload);
      return { ...state, items: newItems };
    }
    case "UPDATE_ITEM_QUANTITY": {
      const newItems = state.items
        .map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
        .filter((item) => item.quantity > 0);
      return { ...state, items: newItems };
    }
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "HYDRATE":
      return {
        ...state,
        items: action.payload.items,
      };
    default:
      return state;
  }
}

const initialState: CartState = {
  items: [],
  totalPrice: 0,
};

// Queue storage key
const OFFLINE_QUEUE_KEY = "cart_offline_queue";

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to load products for cart items
async function loadProductsForCartItems(items: { id: number; quantity: number }[]): Promise<CartItem[]> {
  const cartItems = await Promise.all(
    items.map(async (item) => {
      try {
        const product = await ProductService.getProductById(item.id);
        if (product) {
          return {
            id: item.id,
            quantity: item.quantity,
            product: product
          };
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<QueueOperation[]>([]);
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgressRef = useRef(false);

  const itemCount: number = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const totalPrice: number = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cart.items]
  );

  // Load offline queue from localStorage
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (savedQueue) {
        setOfflineQueue(JSON.parse(savedQueue));
      }
    } catch (e) {
      console.error("Failed to load offline queue:", e);
    }
  }, []);

  // Save offline queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
    } catch (e) {
      console.error("Failed to save offline queue:", e);
    }
  }, [offlineQueue]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Connexion rétablie", {
        description: "Synchronisation du panier en cours..."
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Mode hors-ligne", {
        description: "Les modifications seront synchronisées à la reconnexion"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add operation to queue
  const addToQueue = useCallback((operation: Omit<QueueOperation, 'id' | 'timestamp'>) => {
    const newOperation: QueueOperation = {
      ...operation,
      id: generateId(),
      timestamp: Date.now()
    };
    setOfflineQueue(prev => [...prev, newOperation]);
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    setOfflineQueue([]);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }, []);

  // Load cart from localStorage
  const loadLocalCart = useCallback(async (): Promise<CartItem[]> => {
    const savedCart = localStorage.getItem("cart");
    if (!savedCart) return [];
    
    try {
      const parsedCart = JSON.parse(savedCart);
      const items = Array.isArray(parsedCart) ? parsedCart : parsedCart?.items || [];
      
      if (items.length === 0) return [];
      
      const itemsToLoad = items.map((item: any) => ({
        id: item.id,
        quantity: item.quantity
      }));
      
      return await loadProductsForCartItems(itemsToLoad);
    } catch (e) {
      console.error("Failed to parse cart from localStorage", e);
      return [];
    }
  }, []);

  // Load cart from Supabase
  const loadSupabaseCart = useCallback(async (userId: string): Promise<CartItem[]> => {
    if (!isOnline) return [];
    
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', userId);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const itemsToLoad = data.map((item) => ({
        id: item.product_id as number,
        quantity: item.quantity
      }));
      
      return await loadProductsForCartItems(itemsToLoad);
    } catch (error) {
      console.error("Error loading cart from Supabase:", error);
      return [];
    }
  }, [isOnline]);

  // Save cart to Supabase
  const saveToSupabase = useCallback(async (userId: string, items: CartItem[]) => {
    if (!isOnline) {
      // Queue the full sync for when we're back online
      return false;
    }

    setIsSyncing(true);
    try {
      // Clear existing cart items
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
      
      // Insert new cart items
      if (items.length > 0) {
        const cartItemsForDB = items.map(item => ({
          user_id: userId,
          product_id: item.id,
          quantity: item.quantity
        }));
        
        const { error } = await supabase
          .from('cart_items')
          .insert(cartItemsForDB);
        
        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error("Failed to save cart to Supabase:", error);
      // Fallback to localStorage
      localStorage.setItem("cart", JSON.stringify({ items }));
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Process offline queue
  const processOfflineQueue = useCallback(async (userId: string) => {
    if (offlineQueue.length === 0 || syncInProgressRef.current) return;
    
    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      // Save current cart state to Supabase (which includes all queued operations)
      const success = await saveToSupabase(userId, cart.items);
      
      if (success) {
        clearQueue();
        toast.success("Panier synchronisé", {
          description: `${offlineQueue.length} opération(s) synchronisée(s)`
        });
      }
    } catch (error) {
      console.error("Error processing offline queue:", error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [offlineQueue, cart.items, saveToSupabase, clearQueue]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && isAuthenticated && offlineQueue.length > 0) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          processOfflineQueue(user.id);
        }
      });
    }
  }, [isOnline, isAuthenticated, offlineQueue.length, processOfflineQueue]);

  // Manual sync function
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error("Synchronisation impossible", {
        description: "Vous êtes actuellement hors-ligne"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setIsSyncing(true);
      try {
        await saveToSupabase(user.id, cart.items);
        clearQueue();
        toast.success("Panier synchronisé");
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline, cart.items, saveToSupabase, clearQueue]);

  // Merge local cart with Supabase cart on login
  const mergeCartsOnLogin = useCallback(async (userId: string) => {
    setIsSyncing(true);
    try {
      const [localCart, supabaseCart] = await Promise.all([
        loadLocalCart(),
        loadSupabaseCart(userId)
      ]);

      // Merge: combine quantities for same products
      const mergedMap = new Map<number, CartItem>();
      
      // Add Supabase items first
      supabaseCart.forEach(item => {
        mergedMap.set(item.id, item);
      });
      
      // Merge local items (add quantities if exists)
      let hasNewItems = false;
      localCart.forEach(item => {
        const existing = mergedMap.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          mergedMap.set(item.id, item);
          hasNewItems = true;
        }
      });

      const mergedItems = Array.from(mergedMap.values());
      
      if (mergedItems.length > 0) {
        dispatch({
          type: "HYDRATE",
          payload: { items: mergedItems, totalPrice: 0 }
        });
        
        // Save merged cart to Supabase
        if (isOnline) {
          await saveToSupabase(userId, mergedItems);
        }
        
        // Clear localStorage after successful merge
        localStorage.removeItem("cart");
        
        if (hasNewItems && localCart.length > 0) {
          toast.success("Votre panier local a été synchronisé avec votre compte");
        }
      }
    } catch (error) {
      console.error("Error merging carts:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [loadLocalCart, loadSupabaseCart, saveToSupabase, isOnline]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    
    const loadCart = async () => {
      if (isInitialized.current) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (user) {
          setIsAuthenticated(true);
          await mergeCartsOnLogin(user.id);
        } else {
          setIsAuthenticated(false);
          const localCart = await loadLocalCart();
          if (localCart.length > 0 && mounted) {
            dispatch({
              type: "HYDRATE",
              payload: { items: localCart, totalPrice: 0 }
            });
          }
        }
        
        isInitialized.current = true;
      } catch (error) {
        console.error("Error loading cart:", error);
      }
    };

    loadCart();
    
    return () => {
      mounted = false;
    };
  }, [loadLocalCart, mergeCartsOnLogin]);

  // Save cart changes with debounce
  useEffect(() => {
    if (!isInitialized.current) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save to avoid too many requests
    saveTimeoutRef.current = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        if (isOnline) {
          await saveToSupabase(user.id, cart.items);
        } else {
          // Save locally when offline
          localStorage.setItem("cart", JSON.stringify({ items: cart.items }));
        }
      } else {
        localStorage.setItem("cart", JSON.stringify({ items: cart.items }));
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cart.items, saveToSupabase, isOnline]);

  // Handle auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        // Defer Supabase calls with setTimeout to avoid deadlock
        setTimeout(() => {
          mergeCartsOnLogin(session.user.id);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        dispatch({ type: "CLEAR_CART" });
        localStorage.removeItem("cart");
        clearQueue();
        isInitialized.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [mergeCartsOnLogin, clearQueue]);

  // Helper functions with offline queue support
  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
    if (!isOnline && isAuthenticated) {
      addToQueue({ type: "CLEAR" });
    }
  }, [isOnline, isAuthenticated, addToQueue]);

  const addItem = useCallback((product: Product, quantity: number) => {
    dispatch({ type: "ADD_ITEM", payload: product, quantity });
    if (!isOnline && isAuthenticated) {
      addToQueue({ type: "ADD", productId: product.id, quantity });
    }
  }, [isOnline, isAuthenticated, addToQueue]);

  const removeItem = useCallback((itemId: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: itemId });
    if (!isOnline && isAuthenticated) {
      addToQueue({ type: "REMOVE", productId: itemId });
    }
  }, [isOnline, isAuthenticated, addToQueue]);

  const updateItemQuantity = useCallback((id: number, quantity: number) => {
    dispatch({ type: "UPDATE_ITEM_QUANTITY", payload: { id, quantity } });
    if (!isOnline && isAuthenticated) {
      addToQueue({ type: "UPDATE", productId: id, quantity });
    }
  }, [isOnline, isAuthenticated, addToQueue]);

  return (
    <CartContext.Provider value={{ 
      cart: { ...cart, totalPrice }, 
      dispatch, 
      itemCount, 
      totalPrice,
      clearCart,
      addItem,
      removeItem,
      updateItemQuantity,
      isSyncing,
      isAuthenticated,
      isOnline,
      pendingOperations: offlineQueue.length,
      syncNow
    }}>
      {children}
    </CartContext.Provider>
  );
}