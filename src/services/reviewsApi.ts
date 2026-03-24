import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ProductReviewRow =
  Database['public']['Tables']['product_reviews']['Row'];

export async function fetchAllProductReviewsForAdmin(): Promise<
  ProductReviewRow[]
> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateProductReviewApproval(
  reviewId: string,
  isApproved: boolean
) {
  const { error } = await supabase
    .from('product_reviews')
    .update({ is_approved: isApproved })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function deleteProductReviewById(reviewId: string) {
  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId);
  if (error) throw error;
}

export async function fetchApprovedReviewsForProduct(productId: number) {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type ProductReviewInsert = {
  user_id: string;
  product_id: number;
  rating: number;
  title?: string | null;
  comment?: string | null;
  is_approved: boolean;
  photo_urls?: string[];
};

export async function insertProductReview(row: ProductReviewInsert) {
  const { error } = await supabase.from('product_reviews').insert(row);
  if (error) throw error;
}

export async function fetchReviewHelpfulCount(reviewId: string) {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('helpful_count')
    .eq('id', reviewId)
    .single();
  if (error) throw error;
  return data as { helpful_count: number | null };
}

export async function incrementReviewHelpfulCount(
  reviewId: string,
  nextCount: number
) {
  const { error } = await supabase
    .from('product_reviews')
    .update({ helpful_count: nextCount })
    .eq('id', reviewId);
  if (error) throw error;
}

export async function uploadReviewPhoto(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from('review-photos')
    .upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('review-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchUserReviewForProduct(
  productId: number,
  userId: string
) {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
