/**
 * Postgres-backed rate-limit store.
 *
 * Wraps the `public.edge_rate_limit_consume(p_identifier, p_max_attempts,
 * p_window_ms)` RPC defined in migration
 * `20260421120000_edge_rate_limits.sql`.
 *
 * Why not just the in-memory store:
 *   - Supabase Edge Functions run in V8 isolates. Cold starts drop in-memory
 *     state; horizontal scale means two isolates see two separate Maps.
 *   - The RPC uses `INSERT … ON CONFLICT DO UPDATE` for atomicity, so the
 *     "read-then-write" race isn't possible even under concurrent load.
 *
 * We never throw on malformed RPC responses here — the composite store (see
 * `rate-limit-composite.ts`) treats any throw as a signal to fall back to
 * in-memory, so a transient DB blip degrades gracefully instead of failing
 * the user's request.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  RateLimitOptions,
  RateLimitResult,
  RateLimitStore,
} from './rate-limit.ts';

interface RpcRow {
  allowed: boolean;
  remaining: number;
  reset_ms: number | string; // pg bigint can arrive as string over the wire
}

export function createPostgresRateLimitStore(
  admin: SupabaseClient
): RateLimitStore {
  return {
    async consume(
      identifier: string,
      opts: RateLimitOptions
    ): Promise<RateLimitResult> {
      const { data, error } = await admin.rpc('edge_rate_limit_consume', {
        p_identifier: identifier,
        p_max_attempts: opts.maxAttempts,
        p_window_ms: opts.windowMs,
      });
      if (error) throw error;

      // The RPC `RETURNS TABLE(...)` — Supabase delivers it as either a
      // single-element array OR a single object depending on SDK version.
      const row: RpcRow | undefined = Array.isArray(data)
        ? (data[0] as RpcRow | undefined)
        : (data as RpcRow | undefined);
      if (!row) throw new Error('edge_rate_limit_consume returned no row');

      return {
        allowed: Boolean(row.allowed),
        remaining: Number(row.remaining),
        resetMs: Number(row.reset_ms),
      };
    },
  };
}
