import { supabase } from '@/integrations/supabase/client';

/** Generic edge invoke — keeps admin UI off the raw client. */
export function invokeSupabaseEdgeFunction(
  functionName: string,
  body?: Record<string, unknown>
) {
  if (body === undefined) {
    return supabase.functions.invoke(functionName);
  }
  return supabase.functions.invoke(functionName, { body });
}

export function invokeTranslateTag(body: {
  tag: string;
  targetLanguages: string[];
}) {
  return supabase.functions.invoke('translate-tag', { body });
}
