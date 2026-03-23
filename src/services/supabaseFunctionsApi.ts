import { supabase } from '@/integrations/supabase/client';

export function invokeTranslateTag(body: {
  tag: string;
  targetLanguages: string[];
}) {
  return supabase.functions.invoke('translate-tag', { body });
}
