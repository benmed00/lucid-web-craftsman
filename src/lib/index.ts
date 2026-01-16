/**
 * Library exports - centralized utilities
 * This is the main entry point for all shared library code
 */

// ============= Error Handling =============
export {
  AppError,
  NetworkError,
  AuthError,
  ValidationError,
  BusinessError,
  handleError,
  trySafe,
  trySafeSync,
  type ErrorSeverity,
  type ErrorCategory,
} from './errors/AppError';

// ============= Hooks =============
export {
  useStableCallback,
  useStableValue,
  useDebouncedCallback,
  useThrottledCallback,
} from './hooks/useStableCallback';

// ============= API Client =============
export {
  apiClient,
  currencyApi,
  ApiClient,
  fetchWithRetry,
} from './api/apiClient';

// ============= Storage =============
export {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  StorageKeys,
  StorageTTL,
} from './storage/safeStorage';

// ============= Cache =============
export {
  cache,
  CacheTTL,
  CacheTags,
} from './cache/UnifiedCache';

// ============= Utils =============
export { cn } from './utils';
