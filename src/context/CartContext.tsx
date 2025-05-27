// src/context/CartContext.tsx

import { CartAction, CartContext, CartState } from "./useCart";
import React, { useEffect, useMemo, useReducer } from "react";

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
    case "HYDRATE": // Nouveau cas pour l'hydratation
      return {
        items: action.payload.items,
      };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, { items: [] });

  // Calcul du nombre total d’articles (toutes quantités confondues)
  const itemCount: number = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      dispatch({
        type: "HYDRATE",
        payload: JSON.parse(savedCart),
      });
    }
  }, [localStorage]);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, dispatch, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}
