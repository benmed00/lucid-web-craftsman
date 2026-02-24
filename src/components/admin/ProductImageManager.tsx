import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  Image as ImageIcon,
  Move,
  Eye,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  imageUploadService,
  UploadResult,
} from '@/services/imageUploadService';
import ImageUpload from '@/components/ui/ImageUpload';

interface ProductImageManagerProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  productId?: number;
  maxImages?: number;
  className?: string;
}

interface ImageItem {
  url: string;
  uploading: boolean;
  error?: string;
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  images = [],
  onImagesChange,
  productId,
  maxImages = 10,
  className,
}) => {
  const [imageItems, setImageItems] = useState<ImageItem[]>(
    images.map((url) => ({ url, uploading: false }))
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync with parent when images change (only non-uploading images)
  React.useEffect(() => {
    const urls = imageItems
      .filter((item) => !item.error && !item.uploading) // Exclude uploading and error images
      .map((item) => item.url);
    if (JSON.stringify(urls) !== JSON.stringify(images)) {
      onImagesChange(urls);
    }
  }, [imageItems, images, onImagesChange]);

  const handleImageUpload = useCallback(
    async (file: File, previewUrl: string) => {
      if (imageItems.length >= maxImages) {
        toast.error(`Maximum ${maxImages} images autorisées`);
        return;
      }

      // Validate file
      const validation = imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      // Add temp item with preview
      const tempIndex = imageItems.length;
      setImageItems((prev) => [...prev, { url: previewUrl, uploading: true }]);

      try {
        // Compress image if needed
        const fileToUpload =
          file.size > 2 * 1024 * 1024
            ? await imageUploadService.compressImage(file, 1200, 0.8)
            : file;

        // Upload to Supabase
        const result: UploadResult =
          await imageUploadService.uploadProductImage(fileToUpload, productId);

        // Update with real URL
        setImageItems((prev) =>
          prev.map((item, index) =>
            index === tempIndex ? { url: result.url, uploading: false } : item
          )
        );

        // Clean up preview URL
        URL.revokeObjectURL(previewUrl);
        toast.success('Image ajoutée avec succès!');
      } catch (error) {
        console.error('Upload error:', error);

        // Remove failed upload and show error
        setImageItems((prev) => prev.filter((_, index) => index !== tempIndex));
        URL.revokeObjectURL(previewUrl);
        toast.error(error instanceof Error ? error.message : "Erreur d'upload");
      }
    },
    [imageItems, maxImages, productId]
  );

  const handleImageRemove = useCallback(
    async (index: number) => {
      const imageItem = imageItems[index];
      if (!imageItem) return;

      try {
        // Try to delete from storage if it's a real uploaded image
        if (
          imageItem.url.includes('supabase') ||
          imageItem.url.includes('storage')
        ) {
          await imageUploadService.deleteProductImage(imageItem.url);
        }

        // Remove from list
        setImageItems((prev) => prev.filter((_, i) => i !== index));
        toast.success('Image supprimée');
      } catch (error) {
        console.error('Delete error:', error);
        // Still remove from list even if delete failed
        setImageItems((prev) => prev.filter((_, i) => i !== index));
        toast.warning(
          'Image retirée de la liste (suppression du stockage a échoué)'
        );
      }
    },
    [imageItems]
  );

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex !== dropIndex) {
      setImageItems((prev) => {
        const newItems = [...prev];
        const [draggedItem] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        return newItems;
      });
      toast.success('Ordre des images modifié');
    }

    setDragOverIndex(null);
  };

  const canAddMore = imageItems.length < maxImages;
  const hasUploading = imageItems.some((item) => item.uploading);
  const uploadingCount = imageItems.filter((item) => item.uploading).length;

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Images du produit
            <Badge variant="secondary" className="text-xs">
              {imageItems.filter((item) => !item.uploading).length}/{maxImages}
            </Badge>
            {hasUploading && (
              <Badge
                variant="outline"
                className="text-xs text-status-warning border-status-warning/30 bg-status-warning/10"
              >
                {uploadingCount} en cours...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Image Grid */}
          {imageItems.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {imageItems.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative group aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    dragOverIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'border-border',
                    index === 0 ? 'ring-2 ring-primary' : ''
                  )}
                  draggable={!item.uploading}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  {/* Image */}
                  <img
                    src={item.url}
                    alt={`Produit ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Upload overlay */}
                  {item.uploading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs text-primary font-medium">
                          Upload...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions overlay */}
                  {!item.uploading && (
                    <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.url, '_blank');
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 cursor-move"
                          title="Glisser pour réorganiser"
                        >
                          <Move className="h-3 w-3" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageRemove(index);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Primary image indicator */}
                  {index === 0 && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                      Principale
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          {canAddMore && (
            <ImageUpload
              onImageUpload={handleImageUpload}
              title="Ajouter une image"
              description={`Glissez-déposez une image ou cliquez pour sélectionner (${imageItems.length}/${maxImages})`}
              className="min-h-[200px]"
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
              maxSizeMB={5}
            />
          )}

          {/* Help text */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• La première image sera utilisée comme image principale</p>
            <p>• Glissez-déposez pour réorganiser l'ordre des images</p>
            <p>• Formats supportés: JPG, PNG, WebP (max 5MB chacune)</p>
            <p>• Les images sont automatiquement optimisées</p>
            {hasUploading && (
              <div className="flex items-center gap-2 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-status-warning" />
                <span className="text-status-warning font-medium">
                  {uploadingCount} image{uploadingCount > 1 ? 's' : ''} en cours
                  d'upload... Attendez avant de sauvegarder.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductImageManager;
