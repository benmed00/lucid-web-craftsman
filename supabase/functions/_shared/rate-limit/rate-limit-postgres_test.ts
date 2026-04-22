/**
 * Tests for `createPostgresRateLimitStore`.
 *
 * The `makeFakeAdmin` helper returns a mock `SupabaseClient` whose `.rpc(...)`
 * method delegates to a caller-supplied stub. No real DB connection is used
 * — we only verify the store's contract with `edge_rate_limit_consume`:
 *
 *   - passes the right RPC name and argument shape,
 *   - unwraps both the array-of-rows and single-object response variants,
 *   - coerces bigint-as-string `reset_ms` to a `number`,
 *   - throws on RPC `error`,
 *   - throws on empty RPC response (defensive path).
 */

import { assertEquals, assertRejects } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createPostgresRateLimitStore } from './rate-limit-postgres.ts';
import type { RateLimitResult, RateLimitStore } from './rate-limit.ts';

// ---------------------------------------------------------------------------
// Typed RPC fixture shapes
// ---------------------------------------------------------------------------

interface RateLimitRpcRow {
  allowed: boolean;
  remaining: number;
  reset_ms: number | string;
}

interface PostgrestLikeError {
  message: string;
  code?: string;
}

type FakeRpcResponse =
  | { data: RateLimitRpcRow | RateLimitRpcRow[]; error: null }
  | { data: null; error: PostgrestLikeError }
  | { data: null; error: null }; // defensive "empty result" branch

type FakeRpcImpl = (
  name: string,
  args: Record<string, unknown>
) => FakeRpcResponse;

function makeFakeAdmin(rpcImpl: FakeRpcImpl): SupabaseClient {
  return {
    rpc: (name: string, args: Record<string, unknown>) =>
      Promise.resolve(rpcImpl(name, args)),
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test(
  'createPostgresRateLimitStore: passes identifier + opts to the RPC',
  async () => {
    let receivedName: string = '';
    let receivedArgs: Record<string, unknown> = {};
    const store: RateLimitStore = createPostgresRateLimitStore(
      makeFakeAdmin((name, args): FakeRpcResponse => {
        receivedName = name;
        receivedArgs = args;
        return {
          data: [{ allowed: true, remaining: 19, reset_ms: 1_700_000_000_000 }],
          error: null,
        };
      })
    );
    const result: RateLimitResult = await store.consume('order:abc', {
      maxAttempts: 20,
      windowMs: 60_000,
    });
    assertEquals(receivedName, 'edge_rate_limit_consume');
    assertEquals(receivedArgs, {
      p_identifier: 'order:abc',
      p_max_attempts: 20,
      p_window_ms: 60_000,
    });
    assertEquals(result, {
      allowed: true,
      remaining: 19,
      resetMs: 1_700_000_000_000,
    });
  }
);

Deno.test(
  'createPostgresRateLimitStore: accepts object response (single-row RPC)',
  async () => {
    const store: RateLimitStore = createPostgresRateLimitStore(
      makeFakeAdmin(
        (): FakeRpcResponse => ({
          data: { allowed: false, remaining: 0, reset_ms: 1_800_000_000_000 },
          error: null,
        })
      )
    );
    const result: RateLimitResult = await store.consume('order:y', {
      maxAttempts: 20,
      windowMs: 60_000,
    });
    assertEquals(result.allowed, false);
    assertEquals(result.remaining, 0);
    assertEquals(result.resetMs, 1_800_000_000_000);
  }
);

Deno.test(
  'createPostgresRateLimitStore: coerces bigint-as-string reset_ms',
  async () => {
    const store: RateLimitStore = createPostgresRateLimitStore(
      makeFakeAdmin(
        (): FakeRpcResponse => ({
          data: [{ allowed: true, remaining: 5, reset_ms: '1900000000000' }],
          error: null,
        })
      )
    );
    const result: RateLimitResult = await store.consume('order:z', {
      maxAttempts: 20,
      windowMs: 60_000,
    });
    assertEquals(result.resetMs, 1_900_000_000_000);
    assertEquals(typeof result.resetMs, 'number');
  }
);

Deno.test(
  'createPostgresRateLimitStore: throws when RPC returns an error',
  async () => {
    const store: RateLimitStore = createPostgresRateLimitStore(
      makeFakeAdmin(
        (): FakeRpcResponse => ({
          data: null,
          error: { message: 'connection refused', code: '08006' },
        })
      )
    );
    await assertRejects(
      (): Promise<RateLimitResult> =>
        store.consume('order:fail', { maxAttempts: 20, windowMs: 60_000 })
    );
  }
);

Deno.test(
  'createPostgresRateLimitStore: throws when RPC returns no row',
  async () => {
    const store: RateLimitStore = createPostgresRateLimitStore(
      makeFakeAdmin((): FakeRpcResponse => ({ data: null, error: null }))
    );
    await assertRejects(
      (): Promise<RateLimitResult> =>
        store.consume('order:empty', { maxAttempts: 20, windowMs: 60_000 }),
      Error,
      'edge_rate_limit_consume returned no row'
    );
  }
);
