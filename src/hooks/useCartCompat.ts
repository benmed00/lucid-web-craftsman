// src/hooks/useCartCompat.ts
// Compatibility layer for migrating from CartContext to Zustand
// Import this instead of useCart from CartContext for new code

import { useCart as useCartZustand } from '@/stores/cartStore';
import { useCart as useCartContext } from '@/context/CartContext';

// Feature flag: set to true to use Zustand store
const USE_ZUSTAND_CART = true;

/**
 * Compatibility hook that can switch between Context and Zustand implementations
 * Use this during migration phase, then switch fully to Zustand
 */
export function useCart() {
  if (USE_ZUSTAND_CART) {
    return useCartZustand();
  }
  return useCartContext();
}

// Re-export for convenience
export { useCartStore, selectCartItems, selectItemCount, selectTotalPrice, selectIsInCart } from '@/stores/cartStore';
