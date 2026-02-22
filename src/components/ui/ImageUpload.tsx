import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  Loader2,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploadProps {
  currentImage?: string;
  onImageUpload: (file: File, previewUrl: string) => Promise<void>;
  onImageRemove?: () => void;
  className?: string;
  title?: string;
  description?: string;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  aspectRatio?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImage,
  onImageUpload,
  onImageRemove,
  className,
  title = 'Upload Image',
  description = 'Drag and drop an image here, or click to select',
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeMB = 5,
  aspectRatio,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Type de fichier non supporté. Formats acceptés: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return `Fichier trop volumineux. Taille maximum: ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      setIsUploading(true);

      try {
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        // Call the upload handler
        await onImageUpload(file, url);

        toast.success('Image uploadée avec succès!');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error("Erreur lors de l'upload de l'image");

        // Clean up preview URL on error
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload, previewUrl, maxSizeMB, acceptedTypes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onImageRemove?.();
    toast.success('Image supprimée');
  };

  const displayImage = previewUrl || currentImage;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        <div
          className={cn(
            'relative border-2 border-dashed transition-all duration-200 cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />

          {displayImage ? (
            <div className="relative group">
              <div
                className={cn(
                  'w-full bg-muted',
                  aspectRatio && `aspect-[${aspectRatio}]`
                )}
              >
                <img
                  src={displayImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    disabled={isUploading}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Changer
                  </Button>

                  {onImageRemove && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove();
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload status overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Upload en cours...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div
                  className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                    isDragOver ? 'bg-olive-100' : 'bg-stone-100'
                  )}
                >
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 text-olive-600 animate-spin" />
                  ) : (
                    <Upload
                      className={cn(
                        'h-8 w-8',
                        isDragOver ? 'text-olive-600' : 'text-stone-500'
                      )}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-stone-800">{title}</h3>
                  <p className="text-sm text-stone-600 max-w-sm">
                    {description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 text-xs text-stone-500">
                  <span>
                    Formats:{' '}
                    {acceptedTypes
                      .map((t) => t.split('/')[1].toUpperCase())
                      .join(', ')}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>Max: {maxSizeMB}MB</span>
                </div>

                {!isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-olive-300 text-olive-700 hover:bg-olive-50"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Sélectionner une image
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUpload;
