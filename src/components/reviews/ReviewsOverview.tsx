import { Star, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ReviewStats } from '@/hooks/useReviews';
import { cn } from '@/lib/utils';

interface ReviewsOverviewProps {
  stats: ReviewStats;
  className?: string;
}

const StarRating = ({
  rating,
  size = 'md',
}: {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6',
            star <= Math.round(rating)
              ? 'fill-rating-star text-rating-star'
              : 'text-rating-empty'
          )}
        />
      ))}
    </div>
  );
};

export const ReviewsOverview = ({ stats, className }: ReviewsOverviewProps) => {
  const { averageRating, totalReviews, ratingDistribution } = stats;

  if (totalReviews === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="space-y-2">
            <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Aucun avis disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          Avis clients
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
          <StarRating rating={averageRating} size="lg" />
          <p className="text-muted-foreground">
            Basé sur {totalReviews} avis client{totalReviews > 1 ? 's' : ''}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h4 className="font-medium">Répartition des notes</h4>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating] || 0;
            const percentage =
              totalReviews > 0 ? (count / totalReviews) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 min-w-[80px]">
                  <span className="text-sm">{rating}</span>
                  <Star className="w-4 h-4 fill-rating-star text-rating-star" />
                </div>
                <div className="flex-1">
                  <Progress value={percentage} className="h-2" />
                </div>
                <span className="text-sm text-muted-foreground min-w-[40px]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(
                ((ratingDistribution[4] + ratingDistribution[5]) /
                  totalReviews) *
                  100
              )}
              %
            </div>
            <p className="text-sm text-muted-foreground">Avis positifs</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {ratingDistribution[5] || 0}
            </div>
            <p className="text-sm text-muted-foreground">5 étoiles</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
