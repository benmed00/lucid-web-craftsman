/**
 * Library exports - centralized utilities
 */

// Error handling
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

// Hooks
export {
  useStableCallback,
  useStableValue,
  useDebouncedCallback,
  useThrottledCallback,
} from './hooks/useStableCallback';

// API Client
export {
  apiClient,
  currencyApi,
  ApiClient,
  fetchWithRetry,
} from './api/apiClient';

// Re-export existing utils
export { cn } from './utils';
