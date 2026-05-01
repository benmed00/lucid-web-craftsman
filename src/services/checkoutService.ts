/**
 * Checkout orchestration: retries, error classification for payment edge calls.
 */
import { retryWithBackoff } from '@/lib/retryWithBackoff';
import {
  invokeCreatePaymentEdge,
  type EdgeInvokeResult,
} from '@/services/checkoutApi';

export type CreatePaymentBody = Record<string, unknown>;

type CreatePaymentResponseBody = {
  url?: string;
  error?: string;
  error_type?: string;
};

/** Prefer server JSON `error` when invoke returns non-2xx (avoids generic "non-2xx" only). */
export function normalizeCreatePaymentInvokeResult(
  result: EdgeInvokeResult<CreatePaymentResponseBody>
): EdgeInvokeResult<{ url?: string }> {
  const { data, error } = result;
  if (!error) {
    return { data: data as { url?: string } | null, error: null };
  }
  const serverMsg =
    data &&
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as CreatePaymentResponseBody).error === 'string'
      ? String((data as CreatePaymentResponseBody).error).trim()
      : '';
  const msg =
    serverMsg ||
    (error instanceof Error ? error.message : String(error)) ||
    'Payment request failed';
  return { data: null, error: new Error(msg) };
}

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
      const normalized = normalizeCreatePaymentInvokeResult(
        result as EdgeInvokeResult<CreatePaymentResponseBody>
      );
      if (normalized.error) {
        if (isRetryablePaymentInvokeError(normalized.error)) {
          throw normalized.error;
        }
      }
      return normalized;
    },
    {
      maxAttempts,
      baseDelayMs,
      onRetry: onRetry ? () => onRetry() : undefined,
    }
  );
}
