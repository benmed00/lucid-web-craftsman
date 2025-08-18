import { useCart } from "./CartContext";
// import { useMemo } from "react"; // useMemo no longer needed for itemCount

/**
 * Fournit la couleur du badge du panier et le nombre d'articles à partir du CartContext.
 * @returns {object} { itemCount, cartColor, badgeTextColor }
 */
export function useCartUI() {
    const { itemCount } = useCart(); // Get itemCount from CartContext

    // Styling logic remains the same
    const cartColor = itemCount > 0 ? "bg-olive-700" : "bg-stone-700"; // Adjusted condition slightly for empty cart
    const badgeTextColor = itemCount > 0 ? "text-olive-700" : "text-stone-700"; // Adjusted condition slightly

    return { itemCount, cartColor, badgeTextColor };
}
