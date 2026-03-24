import { supabase } from '@/integrations/supabase/client';

export async function fetchPublishedBlogPostRows() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  return { data, error };
}

export async function fetchPublishedBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  return { data, error };
}
