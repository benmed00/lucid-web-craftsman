import type { Json } from './database.types.ts';

/** Narrows Supabase `Json` metadata to a string-keyed record for safe spreads. */
export function jsonToRecord(
  meta: Json | null | undefined
): Record<string, Json> {
  if (
    meta !== null &&
    meta !== undefined &&
    typeof meta === 'object' &&
    !Array.isArray(meta)
  ) {
    return meta as Record<string, Json>;
  }
  return {};
}
