import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, fetchMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

type WrappedFetch = (
  url: RequestInfo | URL,
  options?: RequestInit
) => Promise<Response>;

async function loadWrappedFetch(): Promise<WrappedFetch> {
  vi.resetModules();
  createClientMock.mockReset();

  createClientMock.mockReturnValue({
    auth: { signOut: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  });

  await import('./client');
  // The module creates both an auth-aware client and a public client.
  // These assertions validate auth poisoning cleanup, so pick the client
  // that persists sessions (the auth-aware one).
  const clientCall = createClientMock.mock.calls.find(
    (call) => call[2]?.auth?.persistSession === true
  );
  const options = clientCall?.[2] as {
    global: { fetch: WrappedFetch };
  };
  return options.global.fetch;
}

describe('supabase client auth-state poisoning diagnostics', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('clears only Supabase auth keys after a 401 response', async () => {
    localStorage.setItem(
      'sb-xcvlijchkmhjonhfildm-auth-token',
      JSON.stringify({ access_token: 'poisoned.jwt.token' })
    );
    localStorage.setItem('supabase.auth.token', 'legacy-poisoned-token');
    localStorage.setItem('cart-storage', '{"items":[1,2]}');
    localStorage.setItem('cloud-instance-preview', 'keep');
    localStorage.setItem('editor-store-state', 'keep');

    const wrappedFetch = await loadWrappedFetch();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'invalid JWT' }), { status: 401 })
    );

    await wrappedFetch(
      'https://xcvlijchkmhjonhfildm.supabase.co/rest/v1/products'
    );

    expect(
      localStorage.getItem('sb-xcvlijchkmhjonhfildm-auth-token')
    ).toBeNull();
    expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    expect(localStorage.getItem('cart-storage')).toBe('{"items":[1,2]}');
    expect(localStorage.getItem('cloud-instance-preview')).toBe('keep');
    expect(localStorage.getItem('editor-store-state')).toBe('keep');
  });

  it('clears Supabase auth keys after a 403 response (bad JWT signature)', async () => {
    localStorage.setItem(
      'sb-xcvlijchkmhjonhfildm-auth-token',
      JSON.stringify({ access_token: 'bad-signature.jwt.token' })
    );
    localStorage.setItem('cart-storage', '{"items":[3]}');

    const wrappedFetch = await loadWrappedFetch();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'invalid JWT: bad signature' }), {
        status: 403,
      })
    );

    await wrappedFetch(
      'https://xcvlijchkmhjonhfildm.supabase.co/auth/v1/user'
    );

    expect(
      localStorage.getItem('sb-xcvlijchkmhjonhfildm-auth-token')
    ).toBeNull();
    expect(localStorage.getItem('cart-storage')).toBe('{"items":[3]}');
  });

  it('keeps auth keys untouched when response is successful', async () => {
    localStorage.setItem(
      'sb-xcvlijchkmhjonhfildm-auth-token',
      JSON.stringify({ access_token: 'token-should-stay' })
    );

    const wrappedFetch = await loadWrappedFetch();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await wrappedFetch(
      'https://xcvlijchkmhjonhfildm.supabase.co/rest/v1/products'
    );

    expect(
      localStorage.getItem('sb-xcvlijchkmhjonhfildm-auth-token')
    ).toContain('token-should-stay');
  });

  it('adds x-guest-id header dynamically from current guest session storage', async () => {
    const wrappedFetch = await loadWrappedFetch();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    localStorage.setItem(
      'guest_session',
      JSON.stringify({ data: { guest_id: 'guest-from-wrapper' } })
    );
    await wrappedFetch(
      'https://xcvlijchkmhjonhfildm.supabase.co/rest/v1/products'
    );

    localStorage.setItem(
      'guest_session',
      JSON.stringify({ guestId: 'guest-direct-shape' })
    );
    await wrappedFetch(
      'https://xcvlijchkmhjonhfildm.supabase.co/rest/v1/products'
    );

    const firstHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    const secondHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);

    expect(firstHeaders.get('x-guest-id')).toBe('guest-from-wrapper');
    expect(secondHeaders.get('x-guest-id')).toBe('guest-direct-shape');
  });

  it('ignores corrupted guest session JSON without crashing requests', async () => {
    localStorage.setItem('guest_session', '{not-valid-json');
    const wrappedFetch = await loadWrappedFetch();
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }));

    await expect(
      wrappedFetch('https://xcvlijchkmhjonhfildm.supabase.co/rest/v1/products')
    ).resolves.toBeInstanceOf(Response);

    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get('x-guest-id')).toBeNull();
  });
});
