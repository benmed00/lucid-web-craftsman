import { supabase } from "@/integrations/supabase/client";

export interface UploadResult {
  url: string;
  path: string;
}

export class BlogImageUploadService {
  private static instance: BlogImageUploadService;
  private readonly bucketName = 'blog-images';

  static getInstance(): BlogImageUploadService {
    if (!BlogImageUploadService.instance) {
      BlogImageUploadService.instance = new BlogImageUploadService();
    }
    return BlogImageUploadService.instance;
  }

  /**
   * Upload a blog image to Supabase Storage
   */
  async uploadBlogImage(file: File, postId?: string): Promise<UploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = postId 
        ? `blog-${postId}-${timestamp}-${randomString}.${fileExtension}`
        : `blog-${timestamp}-${randomString}.${fileExtension}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      if (!data) {
        throw new Error('Aucune donnée retournée après l\'upload');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path
      };

    } catch (error) {
      console.error('Blog image upload service error:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue lors de l\'upload');
    }
  }

  /**
   * Delete a blog image from Supabase Storage
   */
  async deleteBlogImage(imagePath: string): Promise<void> {
    try {
      const fileName = this.extractFileNameFromPath(imagePath);
      
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(`Erreur de suppression: ${error.message}`);
      }

    } catch (error) {
      console.error('Blog image delete service error:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue lors de la suppression');
    }
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Type de fichier non supporté. Formats acceptés: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fichier trop volumineux. Taille maximum: 5MB'
      };
    }

    return { isValid: true };
  }

  /**
   * Extract filename from path or URL
   */
  private extractFileNameFromPath(pathOrUrl: string): string {
    if (pathOrUrl.includes('/storage/v1/object/public/')) {
      return pathOrUrl.split('/').pop() || pathOrUrl;
    } else if (pathOrUrl.includes('/')) {
      return pathOrUrl.split('/').pop() || pathOrUrl;
    }
    return pathOrUrl;
  }
}

export const blogImageUploadService = BlogImageUploadService.getInstance();
