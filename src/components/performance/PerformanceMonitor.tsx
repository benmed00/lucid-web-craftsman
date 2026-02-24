import React, { useEffect, useRef } from 'react';
import { taskScheduler } from '@/utils/taskScheduler';

/**
 * Component Performance Monitor
 * Helps identify and optimize components that cause main thread blocking
 */
export const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const renderStartTime = useRef<number>();
  const componentName = useRef<string>('Anonymous');

  useEffect(() => {
    // Monitor component mount performance
    const mountEndTime = performance.now();
    if (renderStartTime.current) {
      const mountDuration = mountEndTime - renderStartTime.current;

      if (mountDuration > 50) {
        console.warn(
          `Component ${componentName.current} took ${mountDuration}ms to mount`
        );
      }
    }
  }, []);

  // Track render start time
  renderStartTime.current = performance.now();

  return <>{children}</>;
};

/**
 * Optimized Image Loader that doesn't block the main thread
 */
export const NonBlockingImageLoader: React.FC<{
  images: string[];
  onComplete?: () => void;
}> = ({ images, onComplete }) => {
  useEffect(() => {
    const loadImages = async () => {
      // Process images in chunks to avoid blocking
      await taskScheduler.scheduleChunked(
        images,
        (imageSrc) => {
          const img = new Image();
          img.src = imageSrc;
        },
        3 // Process 3 images at a time
      );

      onComplete?.();
    };

    // Schedule image loading
    taskScheduler.schedule(loadImages);
  }, [images, onComplete]);

  return null;
};

/**
 * Hook to optimize heavy computations
 */
export const useOptimizedComputation = <T,>(
  computation: () => T,
  dependencies: React.DependencyList,
  fallback?: T
): T | undefined => {
  const [result, setResult] = React.useState<T | undefined>(fallback);
  const [isComputing, setIsComputing] = React.useState(false);

  useEffect(() => {
    if (isComputing) return;

    setIsComputing(true);

    // Schedule computation to avoid blocking main thread
    taskScheduler.schedule(() => {
      try {
        const computed = computation();
        setResult(computed);
      } catch (error) {
        console.error('Computation error:', error);
      } finally {
        setIsComputing(false);
      }
    });
  }, dependencies);

  return result;
};

export default PerformanceMonitor;
