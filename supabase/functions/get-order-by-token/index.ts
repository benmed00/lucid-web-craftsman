/**
 * get-order-by-token — Supabase Edge Function entrypoint.
 *
 * All request logic lives in `handler.ts` so it can be unit-tested with a
 * fake Supabase client. This file is intentionally thin: env wiring +
 * rate-limit store composition + serve.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { handleRequest } from './handler.ts';
import {
  memoryRateLimitStore,
  type RateLimitStore,
} from '../_shared/rate-limit/rate-limit.ts';
import { createPostgresRateLimitStore } from '../_shared/rate-limit/rate-limit-postgres.ts';
import { createCompositeRateLimitStore } from '../_shared/rate-limit/rate-limit-composite.ts';

// Non-null assertions are intentional: missing env at boot should crash loudly
// at module load rather than fail per-request with an opaque runtime error.
const SUPABASE_URL: string = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY: string = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Service role — bypasses RLS. The token is the only authorization check.
const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY);

// Postgres-primary, memory-fallback. If the DB is transiently unavailable
// we log a warning and degrade to the (weaker but functional) per-isolate
// limit so we never 5xx a legitimate user over a rate-limit outage.
const rateLimitStore: RateLimitStore = createCompositeRateLimitStore(
  createPostgresRateLimitStore(admin),
  memoryRateLimitStore,
  {
    onFallback: (err: unknown) => {
      console.warn(
        JSON.stringify({
          fn: 'get-order-by-token',
          step: 'rate_limit_fallback',
          reason: err instanceof Error ? err.message : String(err),
        })
      );
    },
  }
);

Deno.serve(
  (req: Request): Promise<Response> => handleRequest(req, admin, rateLimitStore)
);
