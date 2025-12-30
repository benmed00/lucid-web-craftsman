import { useCart } from "@/stores";

/**
 * Fournit les données UI du panier: couleur, compteur, état de synchronisation.
 * @returns {object} { itemCount, cartColor, badgeTextColor, isSyncing, isOnline, pendingOperations }
 */
export function useCartUI() {
    const { itemCount, isSyncing, isOnline, pendingOperations } = useCart();

    // Use semantic tokens for dark mode compatibility
    const cartColor = itemCount > 0 ? "bg-primary" : "bg-muted";
    const badgeTextColor = itemCount > 0 ? "text-primary" : "text-muted-foreground";

    return { 
        itemCount, 
        cartColor, 
        badgeTextColor, 
        isSyncing, 
        isOnline, 
        pendingOperations 
    };
}