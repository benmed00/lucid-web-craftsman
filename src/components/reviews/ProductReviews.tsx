import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ReviewsOverview } from './ReviewsOverview';
import { ReviewsList } from './ReviewsList';
import { ReviewForm } from './ReviewForm';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { Product } from '@/shared/interfaces/Iproduct.interface';

interface ProductReviewsProps {
  product: Product;
  className?: string;
}

export const ProductReviews = ({ product, className }: ProductReviewsProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userReview, setUserReview] = useState(null);
  const { reviews, stats, loading, markHelpful, getUserReview, refetch } =
    useReviews(product.id);
  const { user } = useAuth();

  useEffect(() => {
    const checkUserReview = async () => {
      if (user) {
        const review = await getUserReview(product.id);
        setUserReview(review);
      }
    };
    checkUserReview();
  }, [user, product.id, getUserReview]);

  const handleReviewSubmitted = () => {
    refetch();
    setActiveTab('reviews');
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="reviews">Avis ({stats.totalReviews})</TabsTrigger>
          <TabsTrigger value="write">
            {userReview ? 'Modifier mon avis' : 'Écrire un avis'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ReviewsOverview stats={stats} />
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {stats.totalReviews} avis client
                {stats.totalReviews > 1 ? 's' : ''}
              </h3>
              {user && !userReview && (
                <Button variant="outline" onClick={() => setActiveTab('write')}>
                  Écrire un avis
                </Button>
              )}
            </div>
            <ReviewsList
              reviews={reviews}
              loading={loading}
              onMarkHelpful={markHelpful}
            />
          </div>
        </TabsContent>

        <TabsContent value="write" className="mt-6">
          {userReview ? (
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">
                Vous avez déjà laissé un avis
              </h3>
              <p className="text-muted-foreground">
                Votre avis est en cours de modération ou déjà publié.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setActiveTab('reviews')}
              >
                Voir tous les avis
              </Button>
            </div>
          ) : (
            <ReviewForm
              productId={product.id}
              productName={product.name}
              onSuccess={handleReviewSubmitted}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
