/**
 * Generic retry utility with exponential backoff.
 * Used for non-critical async operations (session tracking, payment creation).
 */

export interface RetryOptions {
  /** Maximum number of attempts (including first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in ms before first retry. Default: 500 */
  baseDelayMs?: number;
  /** Max delay cap in ms. Default: 5000 */
  maxDelayMs?: number;
  /** Called on each failed attempt (for logging). */
  onRetry?: (attempt: number, error: unknown) => void;
}

const defaults: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
};

/**
 * Retries an async function with exponential backoff + jitter.
 * Returns the result on success or throws the last error.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = { ...defaults, ...options };

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;

      options?.onRetry?.(attempt, error);

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
        maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Silent retry: swallows the final error and returns a fallback value.
 * Ideal for non-blocking operations like session tracking.
 */
export async function retryWithBackoffSilent<T>(
  fn: () => Promise<T>,
  fallback: T,
  options?: RetryOptions
): Promise<T> {
  try {
    return await retryWithBackoff(fn, options);
  } catch {
    return fallback;
  }
}
