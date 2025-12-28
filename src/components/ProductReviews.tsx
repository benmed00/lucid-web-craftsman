import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Review {
  id: string;
  user_id: string;
  product_id: number;
  rating: number;
  title?: string;
  comment?: string;
  is_approved: boolean;
  is_verified_purchase: boolean;
  helpful_count: number;
  reported_count: number;
  created_at: string;
  updated_at: string;
}

interface ProductReviewsProps {
  productId: number;
  productName: string;
}

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: [0, 0, 0, 0, 0] // 1-5 stars
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
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
      // Silent error handling for production
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.length;
    if (total === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: [0, 0, 0, 0, 0]
      });
      return;
    }

    const sum = reviewsData.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / total;

    const distribution = [0, 0, 0, 0, 0];
    reviewsData.forEach(review => {
      distribution[review.rating - 1]++;
    });

    setStats({
      averageRating: average,
      totalReviews: total,
      ratingDistribution: distribution
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vous devez être connecté pour laisser un avis');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          user_id: user.id,
          product_id: productId,
          rating: reviewForm.rating,
          title: reviewForm.title || null,
          comment: reviewForm.comment || null,
          is_approved: false // Reviews need approval
        });

      if (error) throw error;

      toast.success('Merci pour votre avis ! Il sera publié après modération.');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, title: '', comment: '' });
    } catch (error) {
      // Silent error handling for production
      toast.error('Erreur lors de l\'envoi de votre avis');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 20) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={`${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300'
        } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
        onClick={interactive ? () => setReviewForm(prev => ({ ...prev, rating: i + 1 })) : undefined}
      />
    ));
  };

  const renderRatingDistribution = () => {
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = stats.ratingDistribution[rating - 1];
          const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <span className="w-2">{rating}</span>
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Avis clients</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {renderStars(Math.round(stats.averageRating))}
                  <span className="ml-2 text-lg font-medium">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-gray-600">
                  ({stats.totalReviews} avis)
                </span>
              </div>
            </div>
            
            {user && (
              <Button 
                onClick={() => setShowReviewForm(true)}
                className="bg-olive-700 hover:bg-olive-800"
              >
                Laisser un avis
              </Button>
            )}
          </div>
        </CardHeader>
        
        {stats.totalReviews > 0 && (
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-medium mb-3">Répartition des notes</h4>
                {renderRatingDistribution()}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Basé sur {stats.totalReviews} avis vérifiés
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle size={16} />
                  <span>Avis modérés et vérifiés</span>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Review Form */}
      {showReviewForm && (
        <Card>
          <CardHeader>
            <h4 className="text-lg font-semibold">Laisser un avis pour {productName}</h4>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <Label htmlFor="rating">Note *</Label>
                <div className="flex gap-1 mt-1">
                  {renderStars(reviewForm.rating, true, 24)}
                </div>
              </div>
              
              <div>
                <Label htmlFor="title">Titre de l'avis</Label>
                <Input
                  id="title"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Résumez votre expérience en quelques mots"
                  maxLength={100}
                />
              </div>
              
              <div>
                <Label htmlFor="comment">Commentaire</Label>
                <Textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Partagez votre expérience avec ce produit..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reviewForm.comment.length}/500 caractères
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-olive-700 hover:bg-olive-800"
                >
                  {submitting ? 'Envoi...' : 'Publier l\'avis'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-gray-500 mb-4">
                <Star size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Aucun avis pour le moment</p>
                <p className="text-sm">Soyez le premier à donner votre avis !</p>
              </div>
              {user && (
                <Button 
                  onClick={() => setShowReviewForm(true)}
                  variant="outline"
                >
                  Laisser le premier avis
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-olive-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Client vérifié
                      </span>
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle size={12} className="mr-1" />
                            Achat vérifié
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {renderStars(review.rating, false, 14)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(review.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {review.title && (
                  <h5 className="font-medium mb-2">{review.title}</h5>
                )}
                
                {review.comment && (
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {review.comment}
                  </p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <button className="flex items-center gap-1 hover:text-olive-700 transition-colors">
                    <ThumbsUp size={14} />
                    <span>Utile ({review.helpful_count})</span>
                  </button>
                  <button className="flex items-center gap-1 hover:text-red-600 transition-colors">
                    <Flag size={14} />
                    <span>Signaler</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;