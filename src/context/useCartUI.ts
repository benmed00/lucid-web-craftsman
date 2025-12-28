import { useCart } from "./CartContext";
// import { useMemo } from "react"; // useMemo no longer needed for itemCount

/**
 * Fournit la couleur du badge du panier et le nombre d'articles à partir du CartContext.
 * @returns {object} { itemCount, cartColor, badgeTextColor }
 */
export function useCartUI() {
    const { itemCount } = useCart(); // Get itemCount from CartContext

    // Use semantic tokens for dark mode compatibility
    const cartColor = itemCount > 0 ? "bg-primary" : "bg-muted";
    const badgeTextColor = itemCount > 0 ? "text-primary" : "text-muted-foreground";

    return { itemCount, cartColor, badgeTextColor };
}
