import { useEffect } from 'react';

/**
 * TTI Optimizer Component
 * Handles post-load optimizations to improve Time to Interactive
 */
export const TTIOptimizer = () => {
  useEffect(() => {
    // Optimize after component mount to not block initial render
    const optimizeTTI = () => {
      // Preload critical resources for subsequent navigation
      const criticalResources = [
        '/assets/images/home_page_image.webp',
        '/assets/images/handmade_products.webp'
      ];
      
      criticalResources.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'image';
        document.head.appendChild(link);
      });
      
      // Clean up any unnecessary event listeners after TTI
      const unusedEvents = document.querySelectorAll('[data-cleanup="true"]');
      unusedEvents.forEach(el => {
        const clone = el.cloneNode(true);
        el.parentNode?.replaceChild(clone, el);
      });
    };
    
    // Defer optimization to not impact TTI
    const timeoutId = setTimeout(optimizeTTI, 3000);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return null; // This component doesn't render anything
};

export default TTIOptimizer;