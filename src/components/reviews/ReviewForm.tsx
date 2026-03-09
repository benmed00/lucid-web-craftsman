import { useState, useRef } from 'react';
import { Star, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hapticFeedback } from '@/utils/haptics';

interface ReviewFormProps {
  productId: number;
  productName: string;
  onSuccess?: () => void;
}

const MAX_PHOTOS = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ReviewForm = ({ productId, productName, onSuccess }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { submitReview, submitting } = useReviews();
  const { user } = useAuth();

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - photos.length;
    const selected = files.slice(0, remaining);

    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} dépasse la taille maximale de 5 Mo`);
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} : format non supporté (JPEG, PNG, WebP uniquement)`);
        return;
      }
    }

    setPhotos((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user || photos.length === 0) return [];
    const urls: string[] = [];

    for (const file of photos) {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('review-photos').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('review-photos').getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    setUploading(true);
    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        photoUrls = await uploadPhotos();
      }

      const success = await submitReview({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      });

      if (success) {
        hapticFeedback('success');
        setRating(0);
        setTitle('');
        setComment('');
        setPhotos([]);
        setPhotoPreviews([]);
        onSuccess?.();
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Erreur lors du téléchargement des photos');
    } finally {
      setUploading(false);
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

  const isSubmitting = submitting || uploading;

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
                  onClick={() => { hapticFeedback('selection'); setRating(star); }}
                >
                  <Star
                    className={cn(
                      'w-8 h-8 transition-colors',
                      star <= (hoverRating || rating)
                        ? 'fill-rating-star text-rating-star'
                        : 'text-rating-empty'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && 'Très décevant'}
                {rating === 2 && 'Décevant'}
                {rating === 3 && 'Moyen'}
                {rating === 4 && 'Bien'}
                {rating === 5 && 'Excellent'}
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

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos (optionnel, {MAX_PHOTOS} max)</Label>
            <div className="flex flex-wrap gap-3">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={preview} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <ImagePlus className="h-6 w-6" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP • 5 Mo max par photo</p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={!rating || isSubmitting} className="w-full">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </span>
            ) : (
              "Publier l'avis"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Votre avis sera publié après validation par notre équipe.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
