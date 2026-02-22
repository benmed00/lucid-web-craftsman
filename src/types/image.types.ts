// Global image types for the entire application
export interface ImageConfig {
  src: string;
  alt: string;
  fallback?: string;
  category?: 'product' | 'hero' | 'blog' | 'instagram' | 'avatar';
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export interface ImageLoadState {
  isLoading: boolean;
  hasError: boolean;
  attemptedSources: string[];
  currentSrc: string;
}

export interface ImageFallbackConfig {
  product: string[];
  hero: string[];
  blog: string[];
  instagram: string[];
  avatar: string[];
  default: string[];
}

export type ImageCategory = keyof ImageFallbackConfig;
