import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type BlogPostInsert = Database['public']['Tables']['blog_posts']['Insert'];
type BlogPostUpdate = Database['public']['Tables']['blog_posts']['Update'];
type BlogTranslationInsert =
  Database['public']['Tables']['blog_post_translations']['Insert'];
type BlogTranslationUpdate =
  Database['public']['Tables']['blog_post_translations']['Update'];

export async function fetchAllBlogPostsAdminOrdered() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertBlogPostRow(row: BlogPostInsert) {
  const { error } = await supabase.from('blog_posts').insert(row);
  if (error) throw error;
}

export async function updateBlogPostRow(id: string, patch: BlogPostUpdate) {
  const { error } = await supabase
    .from('blog_posts')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBlogPostById(id: string) {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBlogPostTranslationsByPostId(postId: string) {
  const { data, error } = await supabase
    .from('blog_post_translations')
    .select('*')
    .eq('blog_post_id', postId);
  if (error) throw error;
  return data ?? [];
}

export async function updateBlogPostTranslationRow(
  translationId: string,
  patch: BlogTranslationUpdate
) {
  const { error } = await supabase
    .from('blog_post_translations')
    .update(patch)
    .eq('id', translationId);
  if (error) throw error;
}

export async function insertBlogPostTranslationRow(row: BlogTranslationInsert) {
  const { error } = await supabase.from('blog_post_translations').insert(row);
  if (error) throw error;
}
