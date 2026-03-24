import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProductTransUpdate =
  Database['public']['Tables']['product_translations']['Update'];
type ProductTransInsert =
  Database['public']['Tables']['product_translations']['Insert'];
type BlogTransUpdate =
  Database['public']['Tables']['blog_post_translations']['Update'];
type BlogTransInsert =
  Database['public']['Tables']['blog_post_translations']['Insert'];

export async function fetchProductsForTranslationList() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category')
    .order('id');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductTranslationSummaries() {
  const { data, error } = await supabase
    .from('product_translations')
    .select('id, product_id, locale, name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogPostsForTranslationList() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, slug')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogPostTranslationSummaries() {
  const { data, error } = await supabase
    .from('blog_post_translations')
    .select('id, blog_post_id, locale, title');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductTranslationById(id: string) {
  const { data, error } = await supabase
    .from('product_translations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProductTranslationById(
  id: string,
  patch: ProductTransUpdate
) {
  const { error } = await supabase
    .from('product_translations')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function insertProductTranslationRow(row: ProductTransInsert) {
  const { error } = await supabase.from('product_translations').insert(row);
  if (error) throw error;
}

export async function fetchBlogPostTranslationById(id: string) {
  const { data, error } = await supabase
    .from('blog_post_translations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlogPostTranslationById(
  id: string,
  patch: BlogTransUpdate
) {
  const { error } = await supabase
    .from('blog_post_translations')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function insertBlogPostTranslationRow(row: BlogTransInsert) {
  const { error } = await supabase.from('blog_post_translations').insert(row);
  if (error) throw error;
}
