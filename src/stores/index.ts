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
  MAX_CART_QUANTITY,
  HIGH_VALUE_ORDER_THRESHOLD,
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

export {
  useThemeStore,
  useTheme,
  initializeThemeStore,
  selectTheme,
  selectResolvedTheme,
  type Theme
} from './themeStore';
