import { describe, it, expect, vi, afterEach } from 'vitest';

describe('resolveSupabaseOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('strips trailing slash and uses env when set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proj.supabase.co/');
    const { resolveSupabaseOrigin } = await import('./resolveSupabaseOrigin');
    expect(resolveSupabaseOrigin()).toBe('https://proj.supabase.co');
  });

  it('uses fallback when VITE_SUPABASE_URL is empty', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const { resolveSupabaseOrigin, SUPABASE_ORIGIN_FALLBACK } = await import(
      './resolveSupabaseOrigin'
    );
    expect(resolveSupabaseOrigin()).toBe(SUPABASE_ORIGIN_FALLBACK);
  });
});
