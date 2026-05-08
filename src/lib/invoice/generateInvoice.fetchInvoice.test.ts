/**
 * Prerequisites: Vitest (see vite.config.ts).
 * Run: `pnpm exec vitest run src/lib/invoice/generateInvoice.fetchInvoice.test.ts`
 * or `pnpm run test:unit` (includes this file).
 *
 * Asserts fetchInvoice sends Authorization: Bearer anon when session is null
 * (Supabase edge gateway / verify_jwt), and user JWT when logged in.
 * Does not call real Edge Functions — fetch is mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORDER_ID = '22222222-2222-2222-2222-222222222222';

const { getSessionMock, functionsBaseUrl } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  functionsBaseUrl: 'https://unit-test.supabase.co/functions/v1',
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
    },
  },
  resolvedSupabasePublishableKey: 'test-anon-jwt-placeholder',
}));

vi.mock('@/lib/invoice/supabaseFunctionsBaseUrl', () => ({
  supabaseFunctionsV1BaseUrl: () => functionsBaseUrl,
}));

import { fetchInvoice } from './generateInvoice';

describe('fetchInvoice (generate-invoice)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://unit-test.supabase.co');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    getSessionMock.mockReset();
  });

  it('sends Authorization Bearer anon key when session is null', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invoice_number: '2026-TEST',
          html: '<p>ok</p>',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchInvoice(ORDER_ID, 'guest-hmac-token');
    expect(res.invoice_number).toBe('2026-TEST');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.apikey).toBe('test-anon-jwt-placeholder');
    expect(headers.Authorization).toBe('Bearer test-anon-jwt-placeholder');
    expect(JSON.parse(init?.body as string)).toEqual({
      order_id: ORDER_ID,
      token: 'guest-hmac-token',
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/generate-invoice');
  });

  it('sends Authorization Bearer user access_token when session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'user-jwt-at' } },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invoice_number: '2026-OWN',
          html: '<p>x</p>',
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchInvoice(ORDER_ID);

    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer user-jwt-at');
  });
});
