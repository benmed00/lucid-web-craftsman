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
  // Preload critical fonts
  const fontLinks = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  ];
  
  fontLinks.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  });
  
  // Preload critical images
  const criticalImages = [
    '/assets/images/home_page_image.webp',
    '/favicon.png'
  ];
  
  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Preload critical resources
  preloadCriticalResources();
  
  // Lazy load non-critical scripts
  setTimeout(() => {
    // Load analytics or other non-critical scripts
    console.log('Loading non-critical resources...');
  }, 2000);
  
  // Generate sitemap in background for better SEO
  setTimeout(() => {
    generateAndUpdateSitemap().then(result => {
      if (result.success) {
        console.log('Sitemap updated successfully');
      } else {
        console.warn('Failed to update sitemap:', result.error);
      }
    });
  }, 5000);
};