import { supabase } from '@/integrations/supabase/client';

export interface HeroImageData {
  id?: string;
  imageUrl: string;
  altText: string;
  title: string;
  subtitle: string;
  isActive?: boolean;
}

const defaultHeroImage: HeroImageData = {
  imageUrl: '/assets/images/home_page_image.webp',
  altText:
    'Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif',
  title: 'Artisanat Authentique du Rif',
  subtitle: 'Chapeau tressé et sac naturel - Fait main avec amour',
};

export const heroImageService = {
  // Get active hero image from database
  get: async (): Promise<HeroImageData> => {
    try {
      const { data, error } = await supabase
        .from('hero_images')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.warn(
          'No active hero image found, using default:',
          error?.message
        );
        return defaultHeroImage;
      }

      return {
        id: data.id,
        imageUrl: data.image_url,
        altText: data.alt_text,
        title: data.title,
        subtitle: data.subtitle,
        isActive: data.is_active,
      };
    } catch (error) {
      console.error('Error getting hero image data:', error);
      return defaultHeroImage;
    }
  },

  // Upload image to Supabase Storage
  uploadImage: async (file: File): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('hero-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('hero-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error("Erreur lors de l'upload de l'image");
    }
  },

  // Save hero image data to database
  save: async (data: HeroImageData): Promise<HeroImageData> => {
    try {
      // First, deactivate all existing hero images
      await supabase
        .from('hero_images')
        .update({ is_active: false })
        .eq('is_active', true);

      // Then insert the new one as active
      const { data: newData, error } = await supabase
        .from('hero_images')
        .insert({
          image_url: data.imageUrl,
          alt_text: data.altText,
          title: data.title,
          subtitle: data.subtitle,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: newData.id,
        imageUrl: newData.image_url,
        altText: newData.alt_text,
        title: newData.title,
        subtitle: newData.subtitle,
        isActive: newData.is_active,
      };
    } catch (error) {
      console.error('Error saving hero image data:', error);
      throw new Error('Erreur lors de la sauvegarde');
    }
  },

  // Update existing hero image
  update: async (
    id: string,
    data: Partial<HeroImageData>
  ): Promise<HeroImageData> => {
    try {
      const updateData: any = {};
      if (data.imageUrl) updateData.image_url = data.imageUrl;
      if (data.altText) updateData.alt_text = data.altText;
      if (data.title) updateData.title = data.title;
      if (data.subtitle) updateData.subtitle = data.subtitle;

      const { data: updatedData, error } = await supabase
        .from('hero_images')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: updatedData.id,
        imageUrl: updatedData.image_url,
        altText: updatedData.alt_text,
        title: updatedData.title,
        subtitle: updatedData.subtitle,
        isActive: updatedData.is_active,
      };
    } catch (error) {
      console.error('Error updating hero image data:', error);
      throw new Error('Erreur lors de la mise à jour');
    }
  },

  // Reset to default (deactivate all)
  reset: async (): Promise<void> => {
    try {
      await supabase
        .from('hero_images')
        .update({ is_active: false })
        .eq('is_active', true);
    } catch (error) {
      console.error('Error resetting hero image data:', error);
      throw error;
    }
  },
};
