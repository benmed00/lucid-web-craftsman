import { useState, useEffect } from 'react';
import { Star, Eye, Check, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReviewWithProduct {
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
  reported_count: number;
}

export const AdminReviews = () => {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId: string, isApproved: boolean) => {
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: isApproved })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review.id === reviewId
            ? { ...review, is_approved: isApproved }
            : review
        )
      );

      toast.success(
        isApproved ? 'Avis approuvé avec succès' : 'Avis rejeté avec succès'
      );
    } catch (error) {
      console.error('Error updating review status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avis ?')) return;

    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      setReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== reviewId)
      );

      toast.success('Avis supprimé avec succès');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? 'fill-rating-star text-rating-star'
              : 'text-rating-empty'
          }`}
        />
      ))}
    </div>
  );

  const ReviewCard = ({ review }: { review: ReviewWithProduct }) => {
    const timeAgo = formatDistanceToNow(new Date(review.created_at), {
      addSuffix: true,
      locale: fr,
    });

    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Produit #{review.product_id}
                    </span>
                    {review.is_verified_purchase && (
                      <Badge variant="secondary" className="text-xs">
                        Achat vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-muted-foreground">
                      {timeAgo}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={review.is_approved ? 'default' : 'secondary'}>
                  {review.is_approved ? 'Approuvé' : 'En attente'}
                </Badge>
                {review.reported_count > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {review.reported_count}
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              {review.title && (
                <h4 className="font-semibold">{review.title}</h4>
              )}
              {review.comment && (
                <p className="text-muted-foreground">{review.comment}</p>
              )}
            </div>

            {/* Stats */}
            <div className="text-sm text-muted-foreground">
              {review.helpful_count} personnes ont trouvé cet avis utile
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {!review.is_approved ? (
                <Button
                  size="sm"
                  onClick={() => updateReviewStatus(review.id, true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateReviewStatus(review.id, false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Rejeter
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteReview(review.id)}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingReviews = reviews.filter((r) => !r.is_approved);
  const approvedReviews = reviews.filter((r) => r.is_approved);
  const reportedReviews = reviews.filter((r) => r.reported_count > 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Gestion des avis</h1>
            <p className="text-muted-foreground">
              Gérez et modérez les avis clients
            </p>
          </div>
          <div className="text-center py-12">
            <p>Chargement des avis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Gestion des avis</h1>
          <p className="text-muted-foreground">
            Gérez et modérez les avis clients
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total des avis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviews.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {pendingReviews.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedReviews.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Signalés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reportedReviews.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              En attente ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approuvés ({approvedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="reported">
              Signalés ({reportedReviews.length})
            </TabsTrigger>
            <TabsTrigger value="all">Tous ({reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              {pendingReviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun avis en attente de modération
                </div>
              ) : (
                pendingReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <div className="space-y-4">
              {approvedReviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun avis approuvé
                </div>
              ) : (
                approvedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reported" className="mt-6">
            <div className="space-y-4">
              {reportedReviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Aucun avis signalé
                </div>
              ) : (
                reportedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
