// src/context/CartContext.tsx

import React, { useEffect, useMemo, useReducer } from "react";
import { CartAction, CartContext } from "./useCart";
import { CartState } from "@/shared/interfaces/ICart.interface";
import { ICartItem } from "@/shared/interfaces/ICart.interface";

function cartReducer(state: CartState, action: CartAction): CartState {
  const calculateTotal = (items: ICartItem[]): number => 
    items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );
      if (existingItem) {
        const updatedItems = state.items.map((item) =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.quantity }
            : item
        );
        return {
          items: updatedItems,
          total: calculateTotal(updatedItems)
        };
      }
      const newItem = {
        id: action.payload.id,
        quantity: action.quantity,
        product: action.payload,
      };
      return {
        items: [...state.items, newItem],
        total: calculateTotal([...state.items, newItem])
      };
    }
    case "REMOVE_ITEM": {
      const updatedItems = state.items.filter((item) => item.id !== action.payload);
      return {
        items: updatedItems,
        total: calculateTotal(updatedItems)
      };
    }
    case "HYDRATE": {
      return {
        items: action.payload.items,
        total: action.payload.total
      };
    }
    case "HYDRATE": // Nouveau cas pour l'hydratation
      return {
        items: action.payload.items,
        total: calculateTotal(action.payload.items)
      };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

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
    localStorage.setItem("cart", JSON.stringify({ items: cart.items, total: cart.total }));
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, dispatch, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}
