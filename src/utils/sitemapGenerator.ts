import { ProductService } from '@/services/productService';
import { SitemapGenerator } from './sitemap';

export const generateAndUpdateSitemap = async () => {
  try {
    console.log('Generating sitemap...');
    
    // Fetch current products
    const products = await ProductService.getAllProducts();
    console.log(`Found ${products.length} products for sitemap`);
    
    // Initialize sitemap generator
    const generator = new SitemapGenerator();
    
    // Generate sitemap XML
    const sitemapXml = generator.generateSitemap(products, []);
    
    // Generate robots.txt
    const robotsTxt = generator.generateRobotsTxt();
    
    console.log('Sitemap generated successfully');
    
    return {
      sitemap: sitemapXml,
      robots: robotsTxt,
      success: true
    };
  } catch (error) {
    console.error('Error generating sitemap:', error);
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
  if (document.querySelector('link[data-preload-initialized]')) return;
  
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
  
  // Preload critical images (avoid duplicates)
  const criticalImages = [
    '/assets/images/home_page_image.webp',
    '/favicon.png'
  ];
  
  criticalImages.forEach(src => {
    if (!document.querySelector(`link[href="${src}"]`)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    }
  });
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Only preload critical resources - no background API calls
  preloadCriticalResources();
  
  console.log('Performance optimizations initialized');
};