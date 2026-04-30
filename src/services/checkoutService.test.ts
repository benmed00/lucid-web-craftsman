/**
 * Unit tests for payment edge invoke normalization and retries.
 *
 * Prerequisites: none (mocked). No servers.
 * Run: npx vitest run src/services/checkoutService.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPaymentSessionWithRetry,
  isRetryablePaymentInvokeError,
  normalizeCreatePaymentInvokeResult,
} from './checkoutService';
import type { EdgeInvokeResult } from './checkoutApi';

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock('@/services/checkoutApi', () => ({
  invokeCreatePaymentEdge: (...args: unknown[]) => invokeMock(...args),
}));

describe('normalizeCreatePaymentInvokeResult', () => {
  it('passes through success with no error', () => {
    const input: EdgeInvokeResult<{ url?: string; error?: string }> = {
      data: { url: 'https://checkout.stripe.com/c/pay/cs_123' },
      error: null,
    };
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.error).toBeNull();
    expect(out.data).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_123' });
  });

  it('uses data.error when invoke error is present (422 body)', () => {
    const input: EdgeInvokeResult<{ url?: string; error?: string }> = {
      data: { error: 'Stock insuffisant pour ce produit.' },
      error: new Error('Edge Function returned a non-2xx status code'),
    };
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.data).toBeNull();
    expect(out.error?.message).toBe('Stock insuffisant pour ce produit.');
  });

  it('falls back to Error.message when data is null', () => {
    const input: EdgeInvokeResult<{ error?: string }> = {
      data: null,
      error: new Error('Edge Function returned a non-2xx status code'),
    };
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.error?.message).toBe(
      'Edge Function returned a non-2xx status code'
    );
  });

  it('falls back to default when error has empty message and no data.error', () => {
    const input: EdgeInvokeResult<{ error?: string }> = {
      data: {},
      error: new Error(''),
    };
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.error?.message).toBe('Payment request failed');
  });

  it('ignores non-string data.error and falls back to Error.message', () => {
    const input = {
      data: { error: { code: 'x' } as unknown as string },
      error: new Error('invoke failed'),
    } as EdgeInvokeResult<{ error?: string }>;
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.error?.message).toBe('invoke failed');
  });

  it('trims string data.error', () => {
    const input: EdgeInvokeResult<{ error?: string }> = {
      data: { error: '  COD refusé  ' },
      error: new Error('non-2xx'),
    };
    const out = normalizeCreatePaymentInvokeResult(input);
    expect(out.error?.message).toBe('COD refusé');
  });
});

describe('isRetryablePaymentInvokeError', () => {
  it('returns true for network-ish messages', () => {
    expect(isRetryablePaymentInvokeError(new Error('Failed to fetch'))).toBe(
      true
    );
    expect(isRetryablePaymentInvokeError(new Error('503 Service'))).toBe(true);
    expect(isRetryablePaymentInvokeError(new Error('timeout'))).toBe(true);
  });

  it('returns false for validation errors', () => {
    expect(
      isRetryablePaymentInvokeError(
        new Error('Stock insuffisant pour ce produit.')
      )
    ).toBe(false);
  });

  it('returns false for null', () => {
    expect(isRetryablePaymentInvokeError(null)).toBe(false);
  });
});

describe('createPaymentSessionWithRetry', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('does not retry on validation-shaped failure (single invoke)', async () => {
    invokeMock.mockResolvedValue({
      data: { error: 'Le paiement à la livraison: code postal invalide.' },
      error: new Error('Edge Function returned a non-2xx status code'),
    });

    const result = await createPaymentSessionWithRetry(
      'create-payment',
      { items: [] },
      {},
      { maxAttempts: 3, baseDelayMs: 1 }
    );

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result.error?.message).toBe(
      'Le paiement à la livraison: code postal invalide.'
    );
    expect(result.data).toBeNull();
  });

  it('retries once then succeeds on retryable failure', async () => {
    invokeMock
      .mockResolvedValueOnce({
        data: null,
        error: new Error('Failed to fetch'),
      })
      .mockResolvedValueOnce({
        data: { url: 'https://pay.example/session' },
        error: null,
      });

    const result = await createPaymentSessionWithRetry(
      'create-payment',
      { items: [{ product: { id: 1 }, quantity: 1 }] },
      { 'x-csrf-token': 't' },
      { maxAttempts: 3, baseDelayMs: 1 }
    );

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(result.data?.url).toBe('https://pay.example/session');
  });

  it('throws last error when retries exhaust on retryable failure', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('503'),
    });

    await expect(
      createPaymentSessionWithRetry(
        'create-payment',
        {},
        {},
        { maxAttempts: 2, baseDelayMs: 1 }
      )
    ).rejects.toThrow('503');

    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
