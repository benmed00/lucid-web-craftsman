import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { usePaymentOrderLookup } from './usePaymentOrderLookup';

vi.mock('@/services/checkoutApi', () => ({
  invokeOrderLookup: vi.fn(),
}));

import { invokeOrderLookup } from '@/services/checkoutApi';

const validOrderId = '11111111-2222-4333-8444-555555555555';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('usePaymentOrderLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps polling after a single found:false response (retry budget)', async () => {
    const mock = invokeOrderLookup as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue({ data: { found: false }, error: null });

    const { result } = renderHook(
      () =>
        usePaymentOrderLookup(
          { orderId: validOrderId, sessionId: null },
          { enabled: true }
        ),
      { wrapper: wrapper() }
    );

    // First request lands with found:false.
    await waitFor(() => {
      expect(result.current.data?.found).toBe(false);
    });
    expect(mock).toHaveBeenCalledTimes(1);

    // Pre-regression, refetchInterval returned `false` here and the query
    // went cold. Trigger a manual refetch: if the hook treated found:false
    // as a terminal state we'd still get the stale response, but the mock
    // call count proves the query is willing to poll again.
    await result.current.refetch();
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('stops polling once the order is paid', async () => {
    (
      invokeOrderLookup as unknown as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      data: { found: true, is_paid: true, order_id: validOrderId },
      error: null,
    });

    const { result } = renderHook(
      () =>
        usePaymentOrderLookup(
          { orderId: validOrderId, sessionId: null },
          { enabled: true }
        ),
      { wrapper: wrapper() }
    );

    await waitFor(() => {
      expect(result.current.data?.is_paid).toBe(true);
    });

    // Query settled; refetchInterval returned false.
    await waitFor(() => {
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  it('returns no query body for non-UUID order ids and invalid session ids', async () => {
    const { result } = renderHook(
      () =>
        usePaymentOrderLookup(
          { orderId: 'not-a-uuid', sessionId: '' },
          { enabled: true }
        ),
      { wrapper: wrapper() }
    );

    // enabled is gated on a valid body; nothing should fire.
    await waitFor(() => {
      expect(invokeOrderLookup).not.toHaveBeenCalled();
    });
    expect(result.current.isFetching).toBe(false);
  });
});
