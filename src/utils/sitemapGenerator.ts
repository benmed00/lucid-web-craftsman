import { ProductService } from '@/services/productService';
import { SitemapGenerator } from './sitemap';

export const generateAndUpdateSitemap = async () => {
  try {
    // Fetch current products
    const products = await ProductService.getAllProducts();
    
    // Initialize sitemap generator
    const generator = new SitemapGenerator();
    
    // Generate sitemap XML
    const sitemapXml = generator.generateSitemap(products, []);
    
    // Generate robots.txt
    const robotsTxt = generator.generateRobotsTxt();
    
    return {
      sitemap: sitemapXml,
      robots: robotsTxt,
      success: true
    };
  } catch (error) {
    return {
      sitemap: null,
      robots: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const preloadCriticalResources = () => {
  // Avoid duplicate preloading
  if (document.querySelector('meta[data-preload-initialized]')) return;
  
  // Mark as initialized
  const marker = document.createElement('meta');
  marker.setAttribute('data-preload-initialized', 'true');
  document.head.appendChild(marker);
  
  // Preload critical fonts (only if not already loaded)
  const fontLinks = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  ];
  
  fontLinks.forEach(href => {
    if (!document.querySelector(`link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.onload = () => {
        link.rel = 'stylesheet';
      };
      document.head.appendChild(link);
    }
  });
  
  // Only preload home page image on home page
  const currentPath = window.location.pathname;
  if (currentPath === '/' || currentPath === '/index') {
    const homeImage = '/assets/images/home_page_image.webp';
    if (!document.querySelector(`link[href="${homeImage}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = homeImage;
      document.head.appendChild(link);
    }
  }
  
  // Always preload favicon
  const favicon = '/favicon.png';
  if (!document.querySelector(`link[href="${favicon}"]`)) {
    const link = document.createElement('link');
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