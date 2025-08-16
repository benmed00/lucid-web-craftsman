// File_name: src/context/useCart.ts

// import { CartContext } from "./CartContext";

import { createContext, useContext } from "react"; // Removed useMemo

import { Product } from "../shared/interfaces/Iproduct.interface";

export type CartItem = {
    id: number;
    quantity: number;
    product: Product;
};

export type CartState = {
    items: CartItem[];
    totalPrice: number; // Added totalPrice
};

export type CartAction =
    | { type: "ADD_ITEM"; payload: Product; quantity: number }
    | { type: "REMOVE_ITEM"; payload: number } // payload is itemId
    | { type: "UPDATE_ITEM_QUANTITY"; payload: { id: number; quantity: number } }
    | { type: "CLEAR_CART" }
    | { type: "HYDRATE"; payload: CartState };


export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
};

export const CartContext = createContext<{
    cart: CartState;
    dispatch: React.Dispatch<CartAction>;
    itemCount: number;
    totalPrice: number;
    clearCart: () => void;
    addItem: (product: Product, quantity: number) => void;
    removeItem: (itemId: number) => void;
    updateItemQuantity: (id: number, quantity: number) => void;
}>(null!);
