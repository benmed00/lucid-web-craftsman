import { useEffect } from 'react';

interface PerformanceManagerProps {
  children: React.ReactNode;
}

export const PerformanceManager = ({ children }: PerformanceManagerProps) => {
  useEffect(() => {
    // Throttle resize events to prevent performance issues
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Handle resize logic here if needed
      }, 250);
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Intersection Observer for performance monitoring
    const performanceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Track visible components for analytics
            const target = entry.target as HTMLElement;
            if (target.dataset.trackPerformance) {
              console.log('Component visible:', target.dataset.trackPerformance);
            }
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '100px'
      }
    );
    
    // Clean up observers
    return () => {
      window.removeEventListener('resize', handleResize);
      performanceObserver.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, []);

  return <>{children}</>;
};

export default PerformanceManager;