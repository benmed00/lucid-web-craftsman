/**
 * monitor-payment-events — Supabase Edge Function entrypoint.
 *
 * All logic lives in `handler.ts` (testable with a fake Supabase client).
 * This file is intentionally thin: env wiring + serve.
 *
 * See `handler.ts` for the HTTP contract. See `README.md` for the
 * operator runbook (alert routing, sample dashboards).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { handleRequest, type HandlerDeps } from './handler.ts';

const SUPABASE_URL: string = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY: string = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MONITOR_TOKEN: string | undefined =
  Deno.env.get('MONITOR_PAYMENT_EVENTS_TOKEN')?.trim() || undefined;

const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const deps: HandlerDeps = {
  admin,
  serviceRoleKey: SERVICE_KEY,
  monitorToken: MONITOR_TOKEN,
};

Deno.serve((req: Request): Promise<Response> => handleRequest(req, deps));
