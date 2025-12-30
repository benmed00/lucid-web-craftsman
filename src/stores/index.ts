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

export {
  useWishlistStore,
  useWishlist,
  initializeWishlistStore,
  selectWishlistItems,
  selectWishlistCount,
  selectWishlistLoading,
  selectIsInWishlist,
  type WishlistItem
} from './wishlistStore';

export {
  useCurrencyStore,
  useCurrency,
  initializeCurrencyStore,
  selectCurrency,
  selectIsLoading,
  selectLastUpdated,
  type Currency
} from './currencyStore';

// Future stores:
// export { useThemeStore } from './themeStore';
