/**
 * order-confirmation-lookup — Supabase Edge Function entrypoint.
 *
 * All request logic lives in `handler.ts` so it can be unit-tested with a
 * fake Supabase client. This file is intentionally thin: env wiring +
 * composite rate-limit store + serve.
 *
 * See `handler.ts` for the HTTP contract, rate-limit budget, and token
 * shape. See `_shared/rate-limit/` for the shared rate-limit primitives
 * (also consumed by `get-order-by-token`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { handleRequest, type HandlerDeps } from './handler.ts';
import {
  memoryRateLimitStore,
  type RateLimitStore,
} from '../_shared/rate-limit/rate-limit.ts';
import { createPostgresRateLimitStore } from '../_shared/rate-limit/rate-limit-postgres.ts';
import { createCompositeRateLimitStore } from '../_shared/rate-limit/rate-limit-composite.ts';

// Non-null assertions are intentional: missing env at boot should crash
// loudly at module load rather than fail per-request with an opaque error.
const SUPABASE_URL: string = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY: string = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Dedicated secret — never falls back to the service role key. If missing,
// `handler.ts` returns 503 at request time so every environment shows up
// the same way in monitoring.
const TOKEN_SECRET: string =
  Deno.env.get('ORDER_CONFIRMATION_TOKEN_SECRET') ?? '';

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Postgres-primary, memory-fallback. If the DB is transiently unavailable
// we log a warning and degrade to the per-isolate limit so we never 5xx
// legitimate callers over a rate-limit outage.
const rateLimitStore: RateLimitStore = createCompositeRateLimitStore(
  createPostgresRateLimitStore(admin),
  memoryRateLimitStore,
  {
    onFallback: (err: unknown): void => {
      console.warn(
        JSON.stringify({
          fn: 'order-confirmation-lookup',
          step: 'rate_limit_fallback',
          reason: err instanceof Error ? err.message : String(err),
        })
      );
    },
  }
);

const deps: HandlerDeps = {
  admin,
  rateLimitStore,
  tokenSecret: TOKEN_SECRET,
};

Deno.serve((req: Request): Promise<Response> => handleRequest(req, deps));
