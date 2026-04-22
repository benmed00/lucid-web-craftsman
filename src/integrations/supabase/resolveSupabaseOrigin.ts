/**
 * Canonical Supabase project origin (scheme + host, no trailing slash).
 * Used by the JS client and by any raw `fetch` to Edge Functions so both
 * always target the same project.
 */
export const SUPABASE_ORIGIN_FALLBACK =
  'https://xcvlijchkmhjonhfildm.supabase.co';

export function resolveSupabaseOrigin(): string {
  return (
    import.meta.env.VITE_SUPABASE_URL || SUPABASE_ORIGIN_FALLBACK
  ).replace(/\/$/, '');
}
