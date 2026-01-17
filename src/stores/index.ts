// src/stores/index.ts
// Central export for all Zustand stores with unified initialization

import { initializeCartStore as initCart } from './cartStore';
import { initializeWishlistStore as initWishlist } from './wishlistStore';
import { initializeCurrencyStore as initCurrency } from './currencyStore';
import { initializeThemeStore as initTheme } from './themeStore';

// Re-export everything from individual stores
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

export {
  useLanguageStore,
  useLocale,
  useSetLocale,
  useIsRTL,
  initializeLanguageStore
} from './languageStore';

// ============= Unified Store Management =============

interface CleanupFunction {
  (): void;
}

const cleanupFunctions: CleanupFunction[] = [];
let storesInitialized = false;

/**
 * Initialize all stores with proper cleanup tracking
 * Should be called once at app startup (in main.tsx)
 */
export function initializeAllStores(): void {
  if (storesInitialized) {
    console.warn('Stores already initialized. Skipping re-initialization.');
    return;
  }

  storesInitialized = true;

  // Initialize stores that don't require user context
  initCart();
  initCurrency();
  initTheme();
  
  // Wishlist requires userId - initialize with null, will be set when user logs in
  initWishlist(null);

  // Track online/offline cleanup
  const handleOnline = () => {
    // Stores handle their own online/offline logic
  };
  
  const handleOffline = () => {
    // Stores handle their own online/offline logic
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  cleanupFunctions.push(() => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });
}

/**
 * Cleanup all store subscriptions and listeners
 * Useful for testing or when the app unmounts
 */
export function cleanupAllStores(): void {
  cleanupFunctions.forEach(cleanup => {
    try {
      cleanup();
    } catch (error) {
      console.error('Error during store cleanup:', error);
    }
  });
  
  cleanupFunctions.length = 0;
  storesInitialized = false;
}

/**
 * Check if stores are initialized
 */
export function areStoresInitialized(): boolean {
  return storesInitialized;
}

/**
 * Register a cleanup function to be called during store cleanup
 */
export function registerCleanup(cleanup: CleanupFunction): void {
  cleanupFunctions.push(cleanup);
}
