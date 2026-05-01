/**
 * @fileoverview Deno unit tests for `/create-admin-user` HTTP handler ({@link ./handler.ts}).
 * @module supabase/functions/create-admin-user/handler_test
 *
 * Filesystem snapshot (UTC; rerun `Get-ChildItem` / `stat` after substantive edits):
 * - Repository path: `supabase/functions/create-admin-user/handler_test.ts`
 * - Size (bytes): 8323
 * - Created: 2026-04-29T17:11:56Z
 * - Last modified: 2026-04-29T17:15:45Z
 *
 * @description Mocks anon + admin `SupabaseClient` shapes (`rpc`, `auth.getClaims`,
 * `auth.admin.createUser/deleteUser`, `from().insert`). No outbound network calls.
 *
 * **Prerequisites:** Deno ≥ 2 (`node scripts/assert-deno-v2.mjs` parity with other Edge helpers).
 *
 * Run (repository root): `pnpm run test:create-admin-user`
 *
 * @searchTags deno-test, create-admin-user, mock-supabase, rbac, super-admin
 *
 * @see ./handler.ts — implementation under test
 * @see ../../deno.json — compiler + import map (`@std/assert`, `@supabase/supabase-js`)
 */
import { assertEquals } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type CreateAdminHandlerDeps,
  corsHeaders,
  handleCreateAdminRequest,
} from './handler.ts';

/**
 * Fixed env + clients for deterministic tests ({@link CreateAdminHandlerDeps}).
 * Auth and admin instances are stubs built by {@link mockAuth} / {@link asAdminClient}.
 */
function testDeps(
  auth: SupabaseClient,
  admin: SupabaseClient
): CreateAdminHandlerDeps {
  return {
    getEnv: (k) => {
      if (k === 'SUPABASE_URL') return 'http://test.local';
      if (k === 'SUPABASE_ANON_KEY') return 'anon';
      if (k === 'SUPABASE_SERVICE_ROLE_KEY') return 'service';
      return undefined;
    },
    createAuthClient: () => auth,
    createAdminClient: () => admin,
  };
}

/**
 * Narrow admin-side mock aligned with RPC names used by {@link handleCreateAdminRequest}:
 * `has_role`, `check_rate_limit` (may throw when the `rateThrows` test flag is true), `log_security_event`.
 * Implements `auth.admin.createUser/deleteUser` and `.from().insert()` for profiles.
 *
 * @see asAdminClient — casts this object back to {@link SupabaseClient} without full typings.
 */
function mockAdmin(opts: {
  hasRole?: boolean;
  rateOk?: boolean;
  rateThrows?: boolean;
  createUserError?: string | null;
  profileError?: string | null;
}) {
  const hasRole = opts.hasRole ?? true;
  const rateOk = opts.rateOk ?? true;
  return {
    rpc: (name: string): Promise<{ data: unknown; error: unknown }> => {
      if (name === 'has_role')
        return Promise.resolve({ data: hasRole, error: null });
      if (name === 'check_rate_limit') {
        if (opts.rateThrows) return Promise.reject(new Error('rpc network'));
        return Promise.resolve({ data: rateOk, error: null });
      }
      if (name === 'log_security_event')
        return Promise.resolve({ data: null, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      admin: {
        createUser: (): Promise<{
          data: { user: Record<string, unknown> | null };
          error: { message: string } | null;
        }> =>
          opts.createUserError
            ? Promise.resolve({
                data: { user: null },
                error: { message: opts.createUserError },
              })
            : Promise.resolve({
                data: {
                  user: {
                    id: 'new-user-id',
                    email: 'created@example.com',
                  },
                },
                error: null,
              }),
        deleteUser: (): Promise<{
          data: Record<string, unknown>;
          error: null;
        }> =>
          Promise.resolve({
            data: {},
            error: null,
          }),
      },
    },
    from(_table: string) {
      return {
        insert: (): Promise<{ error: { message: string } | null }> =>
          Promise.resolve(
            opts.profileError
              ? { error: { message: opts.profileError } }
              : { error: null }
          ),
      };
    },
  };
}

/**
 * Adapts {@link mockAdmin} to the minimal `SupabaseClient` surface the handler touches
 * (`rpc` Promise-wrapped, nested `auth.admin`, `from`).
 */
function asAdminClient(m: ReturnType<typeof mockAdmin>): SupabaseClient {
  const api = {
    rpc(name: string, _params?: object) {
      return Promise.resolve(m.rpc(name));
    },
    auth: m.auth,
    from: (t: string) => m.from(t),
  };
  return api as unknown as SupabaseClient;
}

/**
 * Anon Supabase client exposing only `auth.getClaims` (`ok` toggles valid claims + `sub`).
 */
function mockAuth(ok: boolean) {
  return {
    auth: {
      getClaims: (): Promise<{
        data: { claims: { sub: string } } | null;
        error: { message: string } | null;
      }> =>
        Promise.resolve(
          ok
            ? {
                data: {
                  claims: { sub: 'caller-uuid' },
                },
                error: null,
              }
            : { data: null, error: { message: 'bad' } }
        ),
    },
  } as unknown as SupabaseClient;
}

Deno.test('OPTIONS returns cors preflight OK', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', { method: 'OPTIONS' }),
    testDeps(mockAuth(false), asAdminClient(mockAdmin({})))
  );
  assertEquals(res.status, 200);
  assertEquals(await res.text(), 'ok');
  assertEquals(
    res.headers.get('Access-Control-Allow-Origin'),
    corsHeaders['Access-Control-Allow-Origin']
  );
});

Deno.test('401 when Authorization header missing', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({}),
    }),
    testDeps(mockAuth(false), asAdminClient(mockAdmin({})))
  );
  assertEquals(res.status, 401);
});

Deno.test('401 when getClaims fails', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({ email: 'a@b.com', password: '123456789' }),
    }),
    testDeps(mockAuth(false), asAdminClient(mockAdmin({ hasRole: true })))
  );
  assertEquals(res.status, 401);
});

Deno.test('403 when caller is not super_admin', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        email: 'a@b.com',
        password: '123456789',
      }),
    }),
    testDeps(mockAuth(true), asAdminClient(mockAdmin({ hasRole: false })))
  );
  assertEquals(res.status, 403);
});

Deno.test('429 when rate limit RPC returns falsy data', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        email: 'a@b.com',
        password: '123456789',
      }),
    }),
    testDeps(mockAuth(true), asAdminClient(mockAdmin({ rateOk: false })))
  );
  assertEquals(res.status, 429);
});

Deno.test('400 when password too short after auth succeeds', async () => {
  const res = await handleCreateAdminRequest(
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        email: 'a@b.com',
        password: 'short',
      }),
    }),
    testDeps(
      mockAuth(true),
      asAdminClient(mockAdmin({ hasRole: true, rateOk: true }))
    )
  );
  assertEquals(res.status, 400);
});

Deno.test(
  '200 success path with mocked createUser + profiles insert',
  async () => {
    const res = await handleCreateAdminRequest(
      new Request('http://localhost/', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
        },
        body: JSON.stringify({
          email: 'a@b.com',
          password: '123456789',
          userData: { full_name: 'Test' },
        }),
      }),
      testDeps(
        mockAuth(true),
        asAdminClient(mockAdmin({ hasRole: true, rateOk: true }))
      )
    );
    assertEquals(res.status, 200);
    const json = JSON.parse(await res.text()) as { success?: boolean };
    assertEquals(json.success, true);
  }
);

Deno.test(
  'rate limit RPC thrown error is ignored (fallback allow)',
  async () => {
    const res = await handleCreateAdminRequest(
      new Request('http://localhost/', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
        },
        body: JSON.stringify({
          email: 'a@b.com',
          password: '123456789',
        }),
      }),
      testDeps(
        mockAuth(true),
        asAdminClient(mockAdmin({ hasRole: true, rateThrows: true }))
      )
    );
    assertEquals(res.status, 200);
  }
);
