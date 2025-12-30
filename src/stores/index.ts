// src/stores/index.ts
// Central export for all Zustand stores

export { 
  useCartStore, 
  useCart,
  initializeCartStore,
  selectCartItems,
  selectItemCount,
  selectTotalPrice,
  selectIsInCart,
  selectPendingOperations,
  type CartItem 
} from './cartStore';

// Future stores will be exported here:
// export { useWishlistStore } from './wishlistStore';
// export { useCurrencyStore } from './currencyStore';
// export { useThemeStore } from './themeStore';
