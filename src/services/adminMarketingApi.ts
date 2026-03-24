import { supabase } from '@/integrations/supabase/client';

export async function fetchActiveNewsletterSubscriptions() {
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function rpcGetCustomerSegments() {
  return supabase.rpc('get_customer_segments');
}
