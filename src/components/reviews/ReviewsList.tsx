import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Star, ThumbsUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useReviews, Review } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';

interface ReviewsListProps {
  reviews: Review[];
  onMarkHelpful?: (reviewId: string) => void;
  loading?: boolean;
}

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-200'
          )}
        />
      ))}
    </div>
  );
};

const ReviewCard = ({ review, onMarkHelpful }: { review: Review; onMarkHelpful?: (id: string) => void }) => {
  const timeAgo = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
    locale: fr
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with user info and rating */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    Utilisateur vérifié
                  </p>
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="text-xs">
                      Achat vérifié
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={review.rating} />
                  <span className="text-sm text-muted-foreground">{timeAgo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Review content */}
          <div className="space-y-2">
            {review.title && (
              <h4 className="font-semibold text-lg">{review.title}</h4>
            )}
            {review.comment && (
              <p className="text-muted-foreground leading-relaxed">
                {review.comment}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkHelpful?.(review.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Utile ({review.helpful_count})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ReviewsList = ({ reviews, onMarkHelpful, loading }: ReviewsListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-muted rounded" />
                    <div className="w-24 h-3 bg-muted rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-3/4 h-4 bg-muted rounded" />
                  <div className="w-full h-3 bg-muted rounded" />
                  <div className="w-2/3 h-3 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-2">
            <Star className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-medium">Aucun avis pour le moment</h3>
            <p className="text-muted-foreground">
              Soyez le premier à laisser un avis sur ce produit.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onMarkHelpful={onMarkHelpful}
        />
      ))}
    </div>
  );
};