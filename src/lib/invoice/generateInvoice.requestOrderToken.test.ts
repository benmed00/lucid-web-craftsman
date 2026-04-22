import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
  resolvedSupabasePublishableKey: 'test-anon-key',
}));

const ORDER_ID = '11111111-1111-1111-1111-111111111111';

describe('requestOrderToken (sign-order-token)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unit-test.supabase.co');
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('retries at most twice on 409 then returns token', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Order not ready' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Order not ready' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: 'signed.access.token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    vi.stubGlobal('fetch', fetchMock);

    const { requestOrderToken } = await import('./generateInvoice');
    const p = requestOrderToken(ORDER_ID);

    await vi.advanceTimersByTimeAsync(700);
    await vi.advanceTimersByTimeAsync(1400);

    await expect(p).resolves.toBe('signed.access.token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/sign-order-token');
  });

  it('throws after 409 on the third attempt (no further retries)', async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Response(JSON.stringify({ error: 'Order not ready' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requestOrderToken } = await import('./generateInvoice');
    const p = requestOrderToken(ORDER_ID);
    const assertion = expect(p).rejects.toMatchObject({
      message: 'Order not ready',
    });

    await vi.advanceTimersByTimeAsync(700);
    await vi.advanceTimersByTimeAsync(1400);

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-409 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { requestOrderToken } = await import('./generateInvoice');
    await expect(requestOrderToken(ORDER_ID)).rejects.toMatchObject({
      message: 'Order not found',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
