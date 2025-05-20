import { useCart } from "./useCart";
import { useMemo } from "react";

/**
 * Fournit la couleur du badge du panier selon le nombre d’articles dans localStorage.
 * @returns {object} { itemCount, cartColor, badgeTextColor }
 */
export function useCartUI() {
    // Lecture directe du localStorage (synchronisé à chaque rendu)
    const itemCount = useMemo(() => {
        try {
            const cart = JSON.parse(localStorage.getItem("cart") || '{"items":[]}');
            // Supporte les deux formats : [{id,quantity,...}] ou {items:[...]}
            if (Array.isArray(cart)) {
                return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            }
            if (Array.isArray(cart.items)) {
                return cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            }
            return 0;
        } catch {
            return 0;
        }
    }, [localStorage.getItem("cart")]); // Dépendance brute pour forcer le recalcul

    const cartColor = itemCount > 1 ? "bg-olive-700" : "bg-stone-700";
    const badgeTextColor = itemCount > 1 ? "text-olive-700" : "text-stone-700";

    return { itemCount, cartColor, badgeTextColor };
}
