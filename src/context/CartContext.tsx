// src/context/CartContext.tsx

import { CartAction, CartContext, CartState } from "./useCart";
import React, { useMemo, useReducer } from "react"; // Removed useEffect

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + action.quantity }
              : item
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            id: action.payload.id,
            quantity: action.quantity,
            product: action.payload,
          },
        ],
      };
    }
    case "REMOVE_ITEM":
      return {
        items: state.items.filter((item) => item.id !== action.payload),
      };
    // HYDRATE case removed as it's no longer used for localStorage hydration
    // and react-query handles server state.
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Initial state is now simply an empty cart, localStorage is removed.
  const [cart, dispatch] = useReducer(cartReducer, { items: [] });

  // Calcul du nombre total d’articles (toutes quantités confondues)
  const itemCount: number = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  // Removed useEffect for reading from localStorage (HYDRATE on mount)
  // Removed useEffect for writing to localStorage on cart changes

  return (
    <CartContext.Provider value={{ cart, dispatch, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}
