// src/context/CartContext.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductService } from "@/services/productService";
import { toast } from "sonner";

// Types
export type CartItem = {
  id: number;
  quantity: number;
  product: any;
};

export type CartState = {
  items: CartItem[];
  totalPrice: number;
};

export type CartAction =
  | { type: "ADD_ITEM"; payload: any; quantity: number }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_ITEM_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "HYDRATE"; payload: CartState };

// Context type
interface CartContextType {
  cart: CartState;
  dispatch: React.Dispatch<CartAction>;
  itemCount: number;
  totalPrice: number;
  clearCart: () => void;
  addItem: (product: any, quantity: number) => void;
  removeItem: (itemId: number) => void;
  updateItemQuantity: (id: number, quantity: number) => void;
  isSyncing: boolean;
  isAuthenticated: boolean;
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
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, []);

  // Save cart to Supabase
  const saveToSupabase = useCallback(async (userId: string, items: CartItem[]) => {
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
    } catch (error) {
      console.error("Failed to save cart to Supabase:", error);
      // Fallback to localStorage
      localStorage.setItem("cart", JSON.stringify({ items }));
    } finally {
      setIsSyncing(false);
    }
  }, []);

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
        await saveToSupabase(userId, mergedItems);
        
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
  }, [loadLocalCart, loadSupabaseCart, saveToSupabase]);

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
        await saveToSupabase(user.id, cart.items);
      } else {
        localStorage.setItem("cart", JSON.stringify({ items: cart.items }));
      }
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cart.items, saveToSupabase]);

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
        isInitialized.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [mergeCartsOnLogin]);

  // Helper functions
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const addItem = useCallback((product: any, quantity: number) => 
    dispatch({ type: "ADD_ITEM", payload: product, quantity }), []);
  const removeItem = useCallback((itemId: number) => 
    dispatch({ type: "REMOVE_ITEM", payload: itemId }), []);
  const updateItemQuantity = useCallback((id: number, quantity: number) => 
    dispatch({ type: "UPDATE_ITEM_QUANTITY", payload: { id, quantity } }), []);

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
      isAuthenticated
    }}>
      {children}
    </CartContext.Provider>
  );
}