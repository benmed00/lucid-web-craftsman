/**
 * @fileoverview HTTP handler for provisioning users via Auth Admin API (super_admin callers only).
 * @module supabase/functions/create-admin-user/handler
 *
 * Filesystem snapshot (UTC; rerun `stat` / `Get-ChildItem` after substantive edits):
 * - Repository path: `supabase/functions/create-admin-user/handler.ts`
 * - Size (bytes): 9337
 * - Created: 2026-04-29T17:11:31Z
 * - Last modified: 2026-04-29T17:15:24Z
 *
 * @description Validates the inbound JWT (`auth.getClaims`), checks `super_admin` via RPC `has_role`,
 * applies `check_rate_limit`, then creates a user (`auth.admin.createUser`) + `profiles` row.
 * Logs security events through `log_security_event` on failures and successes (fire-and-forget).
 *
 * @searchTags edge-function, rbac, super-admin, provisioning, Auth.admin.createUser, profiles, rate-limit
 *
 * Dependencies: `npm:@supabase/supabase-js@2` via `supabase/functions/deno.json` import map alias.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** CORS headers applied to JSON and preflight responses. */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Injectable factories for Auth vs service-role Supabase clients (used by unit tests).
 *
 * Real Edge behavior: anon client carries the caller Bearer token via `global.headers`;
 * admin client uses the service role key for RPC + `auth.admin` + inserts.
 */
export interface CreateAdminHandlerDeps {
  getEnv: (key: string) => string | undefined;
  createAuthClient: (
    url: string,
    anonKey: string,
    options?: { global?: { headers?: Record<string, string> } }
  ) => SupabaseClient;
  createAdminClient: (url: string, serviceRoleKey: string) => SupabaseClient;
}

/**
 * Defaults for deployed Edge Functions: reads `Deno.env` and constructs real SDK clients.
 * For tests, pass partially mocked {@link CreateAdminHandlerDeps} instead.
 */
export function defaultCreateAdminDeps(): CreateAdminHandlerDeps {
  return {
    getEnv: (key) => Deno.env.get(key),
    createAuthClient: (url, anonKey, options) =>
      createClient(url, anonKey, options as never),
    createAdminClient: (url, serviceRoleKey) =>
      createClient(url, serviceRoleKey),
  };
}

/**
 * Processes a single HTTP request through the admin user creation pipeline.
 *
 * Status codes in order of evaluation:
 * - **200**: `OPTIONS`; or success JSON `{ success, user }`
 * - **401**: Missing/invalid Bearer; token cannot be validated
 * - **403**: Caller is not `super_admin`
 * - **429**: `check_rate_limit` returned falsy
 * - **400**: Bad JSON body / password length / Auth or profile insertion error
 * - **500**: Unexpected exception (message surfaced when safe)
 *
 * Expected JSON body: `{ email, password, userData? }` where `password` ≥ 8 characters.
 *
 * @param req Incoming Fetch `Request`.
 * @param deps Optional dependency bag; defaults wire `Deno.env` and `createClient`.
 */
export async function handleCreateAdminRequest(
  req: Request,
  deps: CreateAdminHandlerDeps = defaultCreateAdminDeps()
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // PHASE: Bearer + JWT validation (anon Supabase client + getClaims)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - No valid authorization header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = deps.createAuthClient(
      deps.getEnv('SUPABASE_URL') ?? '',
      deps.getEnv('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const callerId = claimsData.claims.sub;

    const supabaseAdmin = deps.createAdminClient(
      deps.getEnv('SUPABASE_URL') ?? '',
      deps.getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PHASE: super_admin gate + security log on denial
    const { data: roleCheck, error: roleError } = await supabaseAdmin.rpc(
      'has_role',
      {
        _user_id: callerId,
        _role: 'super_admin',
      }
    );

    if (roleError || !roleCheck) {
      void (async () => {
        const { error: logErr } = await supabaseAdmin.rpc(
          'log_security_event',
          {
            p_event_type: 'UNAUTHORIZED_ADMIN_CREATE_ATTEMPT',
            p_severity: 'critical',
            p_event_data: JSON.stringify({
              caller_id: callerId,
              timestamp: new Date().toISOString(),
              ip_address: req.headers.get('x-forwarded-for') || 'unknown',
            }),
            p_user_id: callerId,
          }
        );
        if (logErr) console.error(logErr);
      })();

      return new Response(
        JSON.stringify({ error: 'Forbidden - Super admin access required' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PHASE: RPC rate limiting (fallback allow when check_rate_limit throws)
    const clientIP =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    let rateLimitOk: unknown;
    try {
      const { data } = await supabaseAdmin.rpc('check_rate_limit', {
        p_identifier: `admin_create_${callerId}`,
        p_action_type: 'admin_user_creation',
        p_max_attempts: 5,
        p_window_minutes: 60,
      });
      rateLimitOk = data;
    } catch {
      rateLimitOk = true;
    }

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded - too many admin creation attempts',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // PHASE: JSON body, Auth admin.createUser, profiles insert, audit log + response
    const { email, password, userData } = await req.json();

    if (!email || !password || password.length < 8) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input - email and password (min 8 chars) required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: userData?.full_name || '',
        },
        email_confirm: true,
      });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: userData?.full_name || null,
        phone: userData?.phone || null,
        address_line1: userData?.address_line1 || null,
        address_line2: userData?.address_line2 || null,
        city: userData?.city || null,
        postal_code: userData?.postal_code || null,
        country: userData?.country || 'France',
        bio: userData?.bio || null,
        avatar_url: userData?.avatar_url || null,
      });

    if (profileError) {
      await supabaseAdmin.auth.admin
        .deleteUser(authData.user.id)
        .catch(console.error);

      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    void (async () => {
      const { error: auditErr } = await supabaseAdmin.rpc(
        'log_security_event',
        {
          p_event_type: 'ADMIN_USER_CREATED',
          p_severity: 'high',
          p_event_data: JSON.stringify({
            created_user_id: authData.user.id,
            created_user_email: email,
            created_by: callerId,
            timestamp: new Date().toISOString(),
            ip_address: clientIP,
          }),
          p_user_id: callerId,
        }
      );
      if (auditErr) console.error(auditErr);
    })();

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-admin-user:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
