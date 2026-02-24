import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Review {
  id: string;
  product_id: number;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  helpful_count: number;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

interface CreateReviewData {
  product_id: number;
  rating: number;
  title?: string;
  comment?: string;
}

export const useReviews = (productId?: number) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const fetchReviews = async (productId: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
      return;
    }

    const totalReviews = reviewsData.length;
    const sumRatings = reviewsData.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = sumRatings / totalReviews;

    const ratingDistribution = reviewsData.reduce(
      (acc, review) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      },
      {} as { [key: number]: number }
    );

    // Ensure all ratings 1-5 are represented
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) {
        ratingDistribution[i] = 0;
      }
    }

    setStats({
      averageRating,
      totalReviews,
      ratingDistribution,
    });
  };

  const submitReview = async (reviewData: CreateReviewData) => {
    if (!user) {
      toast.error('Vous devez être connecté pour laisser un avis');
      return false;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('product_reviews').insert({
        ...reviewData,
        user_id: user.id,
        is_approved: false, // Reviews need approval
      });

      if (error) throw error;

      toast.success('Votre avis a été soumis et sera publié après modération');
      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error("Erreur lors de la soumission de l'avis");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      // First get the current helpful count
      const { data: currentReview, error: fetchError } = await supabase
        .from('product_reviews')
        .select('helpful_count')
        .eq('id', reviewId)
        .single();

      if (fetchError) throw fetchError;

      // Increment helpful count
      const { error } = await supabase
        .from('product_reviews')
        .update({ helpful_count: (currentReview.helpful_count || 0) + 1 })
        .eq('id', reviewId);

      if (error) throw error;

      // Update local state
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, helpful_count: review.helpful_count + 1 }
            : review
        )
      );

      toast.success('Merci pour votre retour');
    } catch (error) {
      console.error('Error marking review helpful:', error);
      toast.error('Erreur lors du vote');
    }
  };

  const getUserReview = async (productId: number) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user review:', error);
      return null;
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews(productId);
    }
  }, [productId]);

  return {
    reviews,
    stats,
    loading,
    submitting,
    submitReview,
    markHelpful,
    getUserReview,
    refetch: () => productId && fetchReviews(productId),
  };
};
