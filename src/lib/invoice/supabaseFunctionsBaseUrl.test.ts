import { describe, it, expect, vi, afterEach } from 'vitest';

describe('supabaseFunctionsBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses VITE_SUPABASE_URL and strips trailing slash', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://myproj.supabase.co/');
    const { supabaseOriginForEdgeFunctions, supabaseFunctionsV1BaseUrl } =
      await import('./supabaseFunctionsBaseUrl');
    expect(supabaseOriginForEdgeFunctions()).toBe('https://myproj.supabase.co');
    expect(supabaseFunctionsV1BaseUrl()).toBe(
      'https://myproj.supabase.co/functions/v1'
    );
  });

  it('falls back when VITE_SUPABASE_URL is empty (matches Supabase client)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const { supabaseOriginForEdgeFunctions, supabaseFunctionsV1BaseUrl } =
      await import('./supabaseFunctionsBaseUrl');
    expect(supabaseOriginForEdgeFunctions()).toBe(
      'https://xcvlijchkmhjonhfildm.supabase.co'
    );
    expect(supabaseFunctionsV1BaseUrl()).toBe(
      'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1'
    );
  });

  it('invoice origin matches resolveSupabaseOrigin (same host as Supabase client)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://drift-guard.supabase.co/');
    vi.resetModules();
    const { resolveSupabaseOrigin } = await import(
      '@/integrations/supabase/resolveSupabaseOrigin'
    );
    const { supabaseOriginForEdgeFunctions } = await import(
      './supabaseFunctionsBaseUrl'
    );
    expect(supabaseOriginForEdgeFunctions()).toBe(resolveSupabaseOrigin());
  });

  it('same alignment when VITE_SUPABASE_URL is empty', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.resetModules();
    const { resolveSupabaseOrigin } = await import(
      '@/integrations/supabase/resolveSupabaseOrigin'
    );
    const { supabaseOriginForEdgeFunctions } = await import(
      './supabaseFunctionsBaseUrl'
    );
    expect(supabaseOriginForEdgeFunctions()).toBe(resolveSupabaseOrigin());
  });
});
