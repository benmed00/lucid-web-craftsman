import { supabase } from '@/integrations/supabase/client';

export interface UploadResult {
  url: string;
  path: string;
}

export class ImageUploadService {
  private static instance: ImageUploadService;
  private readonly bucketName = 'product-images';

  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * Upload a product image to Supabase Storage
   */
  async uploadProductImage(
    file: File,
    productId?: number
  ): Promise<UploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = productId
        ? `product-${productId}-${timestamp}-${randomString}.${fileExtension}`
        : `product-${timestamp}-${randomString}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      if (!data) {
        throw new Error("Aucune donnée retournée après l'upload");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Image upload service error:', error);
      throw error instanceof Error
        ? error
        : new Error("Erreur inconnue lors de l'upload");
    }
  }

  /**
   * Delete a product image from Supabase Storage
   */
  async deleteProductImage(imagePath: string): Promise<void> {
    try {
      // Extract filename from full URL if needed
      const fileName = this.extractFileNameFromPath(imagePath);

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Erreur de suppression: ${error.message}`);
      }
    } catch (error) {
      console.error('Image delete service error:', error);
      throw error instanceof Error
        ? error
        : new Error('Erreur inconnue lors de la suppression');
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadMultipleImages(
    files: File[],
    productId?: number
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) =>
      this.uploadProductImage(file, productId)
    );

    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error('Multiple upload error:', error);
      throw new Error("Erreur lors de l'upload de plusieurs images");
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Type de fichier non supporté. Formats acceptés: ${allowedTypes.map((t) => t.split('/')[1]).join(', ')}`,
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fichier trop volumineux. Taille maximum: 5MB',
      };
    }

    return { isValid: true };
  }

  /**
   * Extract filename from path or URL
   */
  private extractFileNameFromPath(pathOrUrl: string): string {
    if (pathOrUrl.includes('/storage/v1/object/public/')) {
      // Full URL - extract filename from end
      return pathOrUrl.split('/').pop() || pathOrUrl;
    } else if (pathOrUrl.includes('/')) {
      // Path with folders
      return pathOrUrl.split('/').pop() || pathOrUrl;
    }
    // Just filename
    return pathOrUrl;
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    originalUrl: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    }
  ): string {
    // For now, return original URL
    // In the future, we could add image optimization params
    return originalUrl;
  }

  /**
   * Compress image before upload (client-side)
   */
  async compressImage(
    file: File,
    maxWidth = 1200,
    quality = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Erreur de compression'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error("Erreur de chargement de l'image"));
      img.src = URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const imageUploadService = ImageUploadService.getInstance();
