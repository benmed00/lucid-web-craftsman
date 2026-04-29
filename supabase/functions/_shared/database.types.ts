/**
 * Re-export generated SPA Database type for Edge Functions (single shape).
 * Regenerate via `npm run supabase:types:gen` from project root.
 *
 * Prefer untyped `SupabaseClient` from `npm:@supabase/supabase-js@2` on shared
 * helpers (`confirm-order`, `persist-pricing-snapshot`) until insert payloads
 * satisfy strict generated row types under `SupabaseClient<Database>`.
 */
export type { Database } from '../../../src/integrations/supabase/types.ts';
