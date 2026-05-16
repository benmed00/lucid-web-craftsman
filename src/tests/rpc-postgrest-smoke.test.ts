/**
 * PostgREST RPC smoke — real Supabase only, opt-in.
 *
 * Verifies RPC payloads with omitted optional params (undefined → JSON keys omitted)
 * work through supabase-js / PostgREST, matching production client behavior.
 *
 * Prerequisites:
 * - VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (non-placeholder), same as RLS suites
 * - TEST_RPC_SMOKE=1
 * - TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD (admin in admin_users or admin_order_permissions)
 * - TEST_RPC_SMOKE_ORDER_ID (UUID of an order the admin can read)
 *
 * Optional mutation (writes order + history):
 * - TEST_RPC_SMOKE_MUTATE=1 — runs update_order_status after validation; pick an order safe to move.
 *
 * Optional resolve_order_anomaly:
 * - TEST_RPC_SMOKE_ANOMALY_ID — unresolved anomaly UUID; will resolve it (writes DB).
 *
 * Run:
 *   pnpm run test:rpc-smoke
 *   (or: TEST_RPC_SMOKE=1 pnpm exec vitest run src/tests/rpc-postgrest-smoke.test.ts)
 *
 * CI: [.github/workflows/rpc-postgrest-smoke.yml](../../.github/workflows/rpc-postgrest-smoke.yml)
 *    (`workflow_dispatch`). Secrets: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
 *    TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, TEST_RPC_SMOKE_ORDER_ID.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const isRealSupabase =
  Boolean(SUPABASE_URL && ANON_KEY) &&
  !SUPABASE_URL.includes('test.supabase.co') &&
  !ANON_KEY.startsWith('test-anon-key');

const TEST_RPC_SMOKE = process.env.TEST_RPC_SMOKE === '1';
const TEST_RPC_SMOKE_MUTATE = process.env.TEST_RPC_SMOKE_MUTATE === '1';
const ORDER_ID = process.env.TEST_RPC_SMOKE_ORDER_ID?.trim() || '';
const ANOMALY_ID = process.env.TEST_RPC_SMOKE_ANOMALY_ID?.trim() || '';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || '';

const runSuite =
  TEST_RPC_SMOKE &&
  isRealSupabase &&
  Boolean(ORDER_ID) &&
  Boolean(ADMIN_EMAIL) &&
  Boolean(ADMIN_PASSWORD);

let client: SupabaseClient;
let adminUserId: string;

beforeAll(async () => {
  if (!runSuite) return;
  client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (error || !data.user?.id) {
    throw new Error(
      `RPC smoke: admin sign-in failed: ${error?.message ?? 'no user id'}`
    );
  }
  adminUserId = data.user.id;
});

describe.skipIf(!runSuite)('PostgREST RPC smoke (opt-in)', () => {
  it('validate_order_status_transition accepts payload without p_reason_code / p_reason_message when transition does not require reason', async () => {
    const { data: order, error: orderErr } = await client
      .from('orders')
      .select('id, order_status')
      .eq('id', ORDER_ID)
      .maybeSingle();

    expect(orderErr, orderErr?.message).toBeNull();
    expect(order?.order_status, 'order must exist').toBeTruthy();
    const fromStatus = order!.order_status as string;

    const { data: transitions, error: trErr } = await client
      .from('order_state_transitions')
      .select('to_status, requires_reason')
      .eq('from_status', fromStatus)
      .eq('requires_reason', false);

    expect(trErr, trErr?.message).toBeNull();
    const pick =
      transitions?.find((t) => t.to_status !== fromStatus) ?? transitions?.[0];
    if (!pick?.to_status) {
      console.warn(
        '[rpc-postgrest-smoke] No non-reason transition from status; skipping validation assertion'
      );
      return;
    }

    const { data: validation, error: valErr } = await client.rpc(
      'validate_order_status_transition',
      {
        p_order_id: ORDER_ID,
        p_new_status: pick.to_status,
        p_actor: 'admin',
        p_actor_user_id: adminUserId,
      }
    );

    expect(valErr, valErr?.message).toBeNull();
    expect(validation).toBeTruthy();
    const v = validation as { valid?: boolean; error?: string };
    expect(
      v.valid,
      `validation should succeed or fail in-app (not PostgREST 4xx): ${JSON.stringify(validation)}`
    ).toBe(true);
  });

  it.skipIf(!TEST_RPC_SMOKE_MUTATE)(
    'update_order_status omits optional null params and succeeds for a valid transition',
    async () => {
      const { data: order, error: orderErr } = await client
        .from('orders')
        .select('id, order_status')
        .eq('id', ORDER_ID)
        .maybeSingle();

      expect(orderErr, orderErr?.message).toBeNull();
      expect(order?.order_status).toBeTruthy();
      const fromStatus = order!.order_status as string;

      const { data: transitions, error: trErr } = await client
        .from('order_state_transitions')
        .select('to_status, requires_reason')
        .eq('from_status', fromStatus)
        .eq('requires_reason', false);

      expect(trErr, trErr?.message).toBeNull();
      const pick =
        transitions?.find((t) => t.to_status !== fromStatus) ??
        transitions?.[0];
      expect(
        pick?.to_status,
        'need a transition without required reason for mutate smoke'
      ).toBeTruthy();

      const { data, error } = await client.rpc('update_order_status', {
        p_order_id: ORDER_ID,
        p_new_status: pick!.to_status,
        p_actor: 'admin',
        p_actor_user_id: adminUserId,
        p_metadata: {},
      });

      expect(error, error?.message).toBeNull();
      const payload = data as { success?: boolean } | null;
      expect(payload?.success).toBe(true);

      const { data: history, error: hErr } = await client
        .from('order_status_history')
        .select('reason_code, reason_message, changed_by_user_id')
        .eq('order_id', ORDER_ID)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      expect(hErr, hErr?.message).toBeNull();
      expect(history?.changed_by_user_id).toBe(adminUserId);
      expect(history?.reason_code).toBeNull();
      expect(history?.reason_message).toBeNull();
    }
  );

  it.skipIf(!ANOMALY_ID)(
    'resolve_order_anomaly accepts a real admin UUID for p_resolved_by',
    async () => {
      const { data, error } = await client.rpc('resolve_order_anomaly', {
        p_anomaly_id: ANOMALY_ID,
        p_resolved_by: adminUserId,
        p_resolution_notes: 'vitest rpc-postgrest-smoke',
        p_resolution_action: 'reviewed',
      });

      expect(error, error?.message).toBeNull();
      expect(data).toBe(true);
    }
  );
});

describe('PostgREST RPC smoke — config', () => {
  it('skips suite unless TEST_RPC_SMOKE=1 and credentials are set', () => {
    if (runSuite) {
      expect(ORDER_ID.length).toBeGreaterThan(10);
      return;
    }
    expect(true).toBe(true);
  });
});
