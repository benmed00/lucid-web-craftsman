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
