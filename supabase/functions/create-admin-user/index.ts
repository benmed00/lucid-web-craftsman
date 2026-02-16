import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create client with anon key for user verification
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the caller's JWT
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerId = claimsData.claims.sub

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // ===== AUTHORIZATION CHECK - Verify caller has super_admin role =====
    const { data: roleCheck, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: callerId,
      _role: 'super_admin'
    })

    if (roleError || !roleCheck) {
      // Log unauthorized attempt
      await supabaseAdmin.rpc('log_security_event', {
        p_event_type: 'UNAUTHORIZED_ADMIN_CREATE_ATTEMPT',
        p_severity: 'critical',
        p_event_data: JSON.stringify({
          caller_id: callerId,
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown'
        }),
        p_user_id: callerId
      }).catch(console.error)

      return new Response(
        JSON.stringify({ error: 'Forbidden - Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ===== RATE LIMITING =====
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { data: rateLimitOk } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: `admin_create_${callerId}`,
      p_action_type: 'admin_user_creation',
      p_max_attempts: 5,
      p_window_minutes: 60
    }).catch(() => ({ data: true }))

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded - too many admin creation attempts' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ===== PROCESS REQUEST =====
    const { email, password, userData } = await req.json()

    // Validate input
    if (!email || !password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid input - email and password (min 8 chars) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: userData?.full_name || ''
      },
      email_confirm: true
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create profile
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
        avatar_url: userData?.avatar_url || null
      })

    if (profileError) {
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(console.error)
      
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ===== AUDIT LOG =====
    await supabaseAdmin.rpc('log_security_event', {
      p_event_type: 'ADMIN_USER_CREATED',
      p_severity: 'high',
      p_event_data: JSON.stringify({
        created_user_id: authData.user.id,
        created_user_email: email,
        created_by: callerId,
        timestamp: new Date().toISOString(),
        ip_address: clientIP
      }),
      p_user_id: callerId
    }).catch(console.error)

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in create-admin-user:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
