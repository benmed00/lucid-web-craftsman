import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ReviewFormProps {
  productId: number;
  productName: string;
  onSuccess?: () => void;
}

export const ReviewForm = ({ productId, productName, onSuccess }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const { submitReview, submitting } = useReviews();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rating) {
      return;
    }

    const success = await submitReview({
      product_id: productId,
      rating,
      title: title.trim() || undefined,
      comment: comment.trim() || undefined
    });

    if (success) {
      setRating(0);
      setTitle('');
      setComment('');
      onSuccess?.();
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Connectez-vous pour laisser un avis sur ce produit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laisser un avis pour {productName}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Note *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Très décevant"}
                {rating === 2 && "Décevant"}
                {rating === 3 && "Moyen"}
                {rating === 4 && "Bien"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="review-title">Titre de l'avis (optionnel)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Résumez votre expérience en quelques mots..."
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-comment">Votre avis (optionnel)</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience avec ce produit..."
              rows={4}
              maxLength={500}
            />
            <div className="text-right text-sm text-muted-foreground">
              {comment.length}/500 caractères
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!rating || submitting}
            className="w-full"
          >
            {submitting ? "Envoi en cours..." : "Publier l'avis"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Votre avis sera publié après validation par notre équipe.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};