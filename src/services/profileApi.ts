import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export async function fetchAuthUserOrNull(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

export async function fetchProfileFullById(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

export async function updateProfileReturnRow(
  userId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProfileRow(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name,bio,avatar_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfileRow(row: {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from('profiles').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function updateAuthUserFullName(fullName: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });
  if (error) throw error;
}

export async function uploadAvatarObject(
  filePath: string,
  file: File
): Promise<void> {
  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type });
  if (error) throw error;
}

export function getAvatarPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function upsertProfileAvatarUrl(
  userId: string,
  avatarUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, avatar_url: avatarUrl }, { onConflict: 'id' });
  if (error) throw error;
}

export async function clearProfileAvatarUrl(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchProfileCheckoutPrefill(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'full_name, phone, address_line1, address_line2, city, postal_code, country'
    )
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileFields(
  userId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId);
  if (error) throw error;
}

export async function fetchDefaultShippingAddress(userId: string) {
  const { data, error } = await supabase
    .from('shipping_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
