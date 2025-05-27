// File_name: src/context/useCart.ts

// import { CartContext } from "./CartContext";

import { createContext, useContext, useMemo } from "react";

import { IProduct } from "../shared/interfaces/Iproduct.interface";
import { CartState } from "@/shared/interfaces/ICart.interface";

export type CartAction =
    | { type: "ADD_ITEM"; payload: IProduct; quantity: number }
    | { type: "REMOVE_ITEM"; payload: number }
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
}>(null!);
