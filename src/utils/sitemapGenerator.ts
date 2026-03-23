import { ProductService } from '@/services/productService';
import { SitemapGenerator } from './sitemap';
import { blogPosts } from '@/data/blogPosts';
import { Product } from '@/shared/interfaces/Iproduct.interface';

export const generateAndUpdateSitemap = async () => {
  try {
    // Fetch current products
    const products: Product[] = await ProductService.getAllProducts();

    // Initialize sitemap generator
    const generator: SitemapGenerator = new SitemapGenerator();

    // Generate sitemap XML with blog posts included
    const sitemapXml: string = generator.generateSitemap(products, blogPosts);

    // Generate robots.txt
    const robotsTxt: string = generator.generateRobotsTxt();

    return {
      sitemap: sitemapXml,
      robots: robotsTxt,
      success: true,
    };
  } catch (error) {
    return {
      sitemap: null,
      robots: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const preloadCriticalResources = () => {
  // Avoid duplicate preloading
  if (document.querySelector('meta[data-preload-initialized]')) return;

  // Mark as initialized
  const marker: HTMLMetaElement = document.createElement('meta');
  marker.setAttribute('data-preload-initialized', 'true');
  document.head.appendChild(marker);

  // Preload critical fonts (only if not already loaded)
  const fontLinks: string[] = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  ];

  fontLinks.forEach((href: string) => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link: HTMLLinkElement = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.onload = () => {
        link.rel = 'stylesheet';
      };
      document.head.appendChild(link);
    }
  });

  // Hero image on home: must match what React paints first (see useHeroImage localStorage cache).
  // Always preloading the default .webp caused "preload not used" when the cached hero is a Supabase URL.
  const currentPath: string = window.location.pathname;
  if (currentPath === '/' || currentPath === '/index') {
    const defaultHero: string = '/assets/images/home_page_image.webp';
    let heroPreloadUrl: string = defaultHero;
    try {
      const cached: string | null = localStorage.getItem(
        'rif_hero_image_cache'
      );
      if (cached) {
        const parsed: { imageUrl?: string } = JSON.parse(cached) as {
          imageUrl?: string;
        };
        if (
          parsed?.imageUrl &&
          typeof parsed.imageUrl === 'string' &&
          parsed.imageUrl.length > 0
        ) {
          heroPreloadUrl = parsed.imageUrl;
        }
      }
    } catch {
      // ignore invalid cache
    }
    const heroPreloadExists: boolean = Array.from(
      document.querySelectorAll('link[rel="preload"][as="image"]')
    ).some((l) => l.getAttribute('href') === heroPreloadUrl);

    if (!heroPreloadExists) {
      const link: HTMLLinkElement = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = heroPreloadUrl;
      if (heroPreloadUrl.startsWith('http')) {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    }
  }

  // Always preload favicon
  const favicon: string = '/favicon.png';
  if (!document.querySelector(`link[href="${favicon}"]`)) {
    const link: HTMLLinkElement = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = favicon;
    document.head.appendChild(link);
  }
};

export const initPerformanceOptimizations = () => {
  // Only preload critical resources - no background API calls
  preloadCriticalResources();
};
