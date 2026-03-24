/**
 * Checkout orchestration: retries, error classification for payment edge calls.
 */
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import {
  invokeCreatePaymentEdge,
  type EdgeInvokeResult,
} from '@/services/checkoutApi';

export type CreatePaymentBody = Record<string, unknown>;

export function isRetryablePaymentInvokeError(err: Error | null): boolean {
  if (!err) return false;
  const msg = err.message || '';
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('timeout')
  );
}

export async function createPaymentSessionWithRetry(
  functionName: 'create-payment' | 'create-paypal-payment',
  body: CreatePaymentBody,
  headers: Record<string, string>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    onRetry?: () => void;
  } = {}
): Promise<EdgeInvokeResult<{ url?: string }>> {
  const { maxAttempts = 2, baseDelayMs = 1000, onRetry } = options;

  return retryWithBackoff(
    async () => {
      const result = await invokeCreatePaymentEdge(functionName, body, headers);
      if (result.error) {
        if (isRetryablePaymentInvokeError(result.error as Error)) {
          throw result.error;
        }
      }
      return result;
    },
    {
      maxAttempts,
      baseDelayMs,
      onRetry: onRetry ? () => onRetry() : undefined,
    }
  );
}
