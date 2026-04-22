import { supabase } from '@/integrations/supabase/client';
import { invokeSupabaseEdgeFunction } from '@/services/supabaseFunctionsApi';

/** Avatar upload for pre-user creation (path under `avatars/`). */
export async function uploadPublicAvatarForNewClient(
  file: File
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);
    if (uploadError) return null;
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export function createAdminUserEdge(body: object) {
  return invokeSupabaseEdgeFunction(
    'create-admin-user',
    body as Record<string, unknown>
  );
}
