import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { LogStep } from './log.ts';

/**
 * Optional JWT user for logged-in checkout. Logs once when an Authorization
 * header is present (same behaviour as inline handler).
 */
export async function resolveOptionalUserFromAuthHeader(
  supabaseClient: SupabaseClient,
  authHeader: string | null,
  log: LogStep
): Promise<User | null> {
  if (!authHeader) return null;
  const token: string = authHeader.replace('Bearer ', '');
  const { data: userData }: { data: { user: User | null } } =
    await supabaseClient.auth.getUser(token);
  log('User authenticated', { userId: userData.user?.id });
  return userData.user;
}
