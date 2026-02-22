import { useEffect } from 'react';
import { taskScheduler } from '@/utils/taskScheduler';

/**
 * TTI Optimizer Component
 * Handles post-load optimizations to improve Time to Interactive and reduce TBT
 */
export const TTIOptimizer = () => {
  useEffect(() => {
    // Schedule optimizations to avoid blocking main thread
    const optimizeTTI = () => {
      // Break optimization tasks into smaller chunks
      const optimizationTasks = [
        // Task 1: Preload critical resources
        () => {
          const criticalResources = [
            '/assets/images/home_page_image.webp',
            '/assets/images/handmade_products.webp',
          ];

          criticalResources.forEach((href) => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            link.as = 'image';
            document.head.appendChild(link);
          });
        },

        // Task 2: Clean up unused event listeners
        () => {
          const unusedEvents = document.querySelectorAll(
            '[data-cleanup="true"]'
          );
          unusedEvents.forEach((el) => {
            const clone = el.cloneNode(true);
            el.parentNode?.replaceChild(clone, el);
          });
        },

        // Task 3: Optimize images that are out of viewport
        () => {
          const images = document.querySelectorAll('img[loading="lazy"]');
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                // Reduce quality for out-of-viewport images
                const img = entry.target as HTMLImageElement;
                if (img.src.includes('quality=')) {
                  img.src = img.src.replace(/quality=\d+/, 'quality=60');
                }
              }
            });
          });

          images.forEach((img) => observer.observe(img));
        },
      ];

      // Schedule tasks to run without blocking main thread
      taskScheduler.scheduleBatch(optimizationTasks);
    };

    // Defer optimization to not impact TBT
    const timeoutId = setTimeout(() => {
      taskScheduler.schedule(optimizeTTI);
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  return null; // This component doesn't render anything
};

export default TTIOptimizer;
