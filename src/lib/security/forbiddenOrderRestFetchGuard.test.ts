import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  installForbiddenOrderRestFetchGuard,
  resetForbiddenOrderRestFetchGuardForTests,
} from './forbiddenOrderRestFetchGuard';

describe('forbiddenOrderRestFetchGuard', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetForbiddenOrderRestFetchGuardForTests();
    vi.restoreAllMocks();
    history.replaceState(null, '', '/');
  });

  it('throws on /rest/v1/orders when pathname is order-confirmation', async () => {
    history.replaceState(null, '', '/order-confirmation?order_id=x');
    installForbiddenOrderRestFetchGuard();
    await expect(
      fetch('https://proj.supabase.co/rest/v1/orders?select=id')
    ).rejects.toThrow(/Forbidden direct DB access/);
  });

  it('throws on /rest/v1/order_items on invoice route', async () => {
    history.replaceState(null, '', '/invoice/abc');
    installForbiddenOrderRestFetchGuard();
    await expect(
      fetch('https://proj.supabase.co/rest/v1/order_items?select=*')
    ).rejects.toThrow(/Forbidden direct DB access/);
  });

  it('does not throw on home page (admin / orders history still work elsewhere)', async () => {
    history.replaceState(null, '', '/');
    const mock = vi.fn().mockResolvedValue(new Response('{}'));
    globalThis.fetch = mock;
    installForbiddenOrderRestFetchGuard();
    await fetch('https://proj.supabase.co/rest/v1/orders?select=id');
    expect(mock).toHaveBeenCalled();
  });
});
