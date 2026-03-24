import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export async function insertNewsletterSubscription(row: {
  email: string;
  status: string;
  consent_given: boolean;
  consent_date: string;
  source: string;
  double_opt_in: boolean;
  confirmed_at: string;
  updated_at: string;
  metadata: Json;
}) {
  return supabase.from('newsletter_subscriptions').insert(row);
}

export async function invokeNewsletterWelcome(email: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-newsletter-welcome', {
    body: { email },
  });
  if (error) console.error('Welcome email error:', error);
}

export async function unsubscribeNewsletterByEmail(
  email: string
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const { error } = await supabase
    .from('newsletter_subscriptions')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('email', normalized);
  if (error) throw error;
}

export async function fetchNewsletterSubscriptionsAdmin(limit = 100) {
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('id, email, status, source, created_at, unsubscribed_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countStaleAbandonedCheckoutSessions(
  oneHourAgoIso: string
) {
  const { count, error } = await supabase
    .from('checkout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'in_progress')
    .lt('updated_at', oneHourAgoIso)
    .not('personal_info', 'is', null)
    .gte('last_completed_step', 1);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchEmailLogsSince(
  createdAfterIso: string,
  limit = 200
) {
  const { data, error } = await supabase
    .from('email_logs')
    .select(
      'id, template_name, recipient_email, status, sent_at, created_at, error_message'
    )
    .gte('created_at', createdAfterIso)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
