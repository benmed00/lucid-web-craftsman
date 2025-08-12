export interface HeroImageData {
  imageUrl: string;
  altText: string;
  title: string;
  subtitle: string;
}

const HERO_IMAGE_KEY = 'heroImageData';

const defaultHeroImage: HeroImageData = {
  imageUrl: '/assets/images/home_page_image.webp',
  altText: 'Chapeau artisanal et sac traditionnel fait main - Artisanat authentique du Rif',
  title: 'Artisanat Authentique du Rif',
  subtitle: 'Chapeau tressé et sac naturel - Fait main avec amour'
};

export const heroImageService = {
  get: (): HeroImageData => {
    try {
      const stored = localStorage.getItem(HERO_IMAGE_KEY);
      const parsed: HeroImageData | null = stored ? JSON.parse(stored) : null;

      // Sanitize non-persistent or invalid URLs (e.g., blob: from previous admin uploads)
      const data: HeroImageData = {
        ...defaultHeroImage,
        ...(parsed || {}),
      };
      if (data.imageUrl?.startsWith('blob:') || !data.imageUrl) {
        data.imageUrl = defaultHeroImage.imageUrl;
      }
      if (!data.altText) data.altText = defaultHeroImage.altText;

      return data;
    } catch (error) {
      console.error('Error getting hero image data:', error);
      return defaultHeroImage;
    }
  },

  save: (data: HeroImageData): void => {
    try {
      localStorage.setItem(HERO_IMAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving hero image data:', error);
      throw error;
    }
  },

  reset: (): void => {
    try {
      localStorage.removeItem(HERO_IMAGE_KEY);
    } catch (error) {
      console.error('Error resetting hero image data:', error);
      throw error;
    }
  }
};