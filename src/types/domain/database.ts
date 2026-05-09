/**
 * Re-exports the generated Supabase {@link Database} document and a shortcut to all public tables.
 *
 * @see `src/integrations/supabase/types.ts` — **SSOT**; regenerate after migrations (`pnpm run supabase:types:gen`).
 * @see {@link PublicTables} — use `PublicTables['orders']['Row']` in the IDE to jump to any table shape.
 */
import type { Database } from '@/integrations/supabase/types';

export type { Database };

/** All `public` table definitions from {@link Database} (Row / Insert / Update per table). */
export type PublicTables = Database['public']['Tables'];
