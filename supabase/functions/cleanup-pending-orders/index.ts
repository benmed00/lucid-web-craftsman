/**
 * cleanup-pending-orders — Scheduled cleanup of stale pending orders.
 *
 * Cancels orders stuck in 'pending' status for more than 24 hours.
 * Designed to be called via cron/scheduler or manual invocation.
 */
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    const { data, error } = await supabase.rpc('cleanup_stale_pending_orders');

    if (error) {
      console.error('[CLEANUP] RPC error:', error.message);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const cleanedCount = data ?? 0;
    console.log(`[CLEANUP] Cancelled ${cleanedCount} stale pending orders`);

    return new Response(
      JSON.stringify({ success: true, cancelled_count: cleanedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CLEANUP] Error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
