/**
 * Base URL for Supabase Edge Functions (`/functions/v1`).
 * Delegates to `resolveSupabaseOrigin()` — same host as `createClient` in `client.ts`.
 */
import { resolveSupabaseOrigin } from '@/integrations/supabase/resolveSupabaseOrigin';

export function supabaseOriginForEdgeFunctions(): string {
  return resolveSupabaseOrigin();
}

export function supabaseFunctionsV1BaseUrl(): string {
  return `${supabaseOriginForEdgeFunctions()}/functions/v1`;
}
