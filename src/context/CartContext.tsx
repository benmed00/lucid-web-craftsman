// src/context/CartContext.tsx

import { Product } from "../shared/interfaces/Iproduct.interface";
import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";

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
        .filter((item) => item.quantity > 0); // Remove item if quantity is 0 or less
      return { ...state, items: newItems };
    }
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "HYDRATE": // Hydrate should also respect the full CartState shape potentially
      return {
        ...state, // Keep other potential state properties if any in future
        items: action.payload.items,
        // totalPrice will be recalculated by useMemo based on hydrated items
      };
    default:
      return state;
  }
}

const initialState: CartState = {
  items: [],
  totalPrice: 0,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, initialState);

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

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Ensure what we hydrate is compatible with CartState, especially items
        if (parsedCart && Array.isArray(parsedCart.items)) {
           dispatch({
            type: "HYDRATE",
            // Pass only items for hydration, totalPrice will be derived
            payload: { items: parsedCart.items, totalPrice: 0 },
          });
        } else if (Array.isArray(parsedCart)) { // Old format support: array of items
           dispatch({
            type: "HYDRATE",
            payload: { items: parsedCart, totalPrice: 0 },
          });
        }
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        // Optionally clear localStorage if it's corrupted
        // localStorage.removeItem("cart");
      }
    }
  }, []);

  useEffect(() => {
    // Persist only items and totalPrice derived from items.
    // totalPrice in localStorage might not be needed if always calculated.
    // However, if we persist it, ensure it's consistent.
    // For simplicity, we'll persist the cart object which includes items.
    // totalPrice will be recalculated on load.
    localStorage.setItem("cart", JSON.stringify({ items: cart.items }));
  }, [cart.items]); // Depend only on cart.items to avoid loop with totalPrice

  // Helper functions
  const clearCart = () => dispatch({ type: "CLEAR_CART" });
  const addItem = (product: Product, quantity: number) => dispatch({ type: "ADD_ITEM", payload: product, quantity });
  const removeItem = (itemId: number) => dispatch({ type: "REMOVE_ITEM", payload: itemId });
  const updateItemQuantity = (id: number, quantity: number) => dispatch({ type: "UPDATE_ITEM_QUANTITY", payload: { id, quantity } });

  return (
    <CartContext.Provider value={{ 
      cart: { ...cart, totalPrice }, 
      dispatch, 
      itemCount, 
      totalPrice,
      clearCart,
      addItem,
      removeItem,
      updateItemQuantity
    }}>
      {children}
    </CartContext.Provider>
  );
};
