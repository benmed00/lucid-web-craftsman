import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePullToRefreshProps {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPullDistance = 150,
  disabled = false,
}: UsePullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const canPullToRefresh = scrollTop === 0;

      if (canPullToRefresh) {
        setStartY(e.touches[0].clientY);
        setCanPull(true);
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!canPull || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;

      if (deltaY > 0) {
        e.preventDefault();
        setIsPulling(true);
        const distance = Math.min(deltaY * 0.5, maxPullDistance);
        setPullDistance(distance);
      }
    },
    [canPull, disabled, isRefreshing, startY, maxPullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || disabled) return;

    setCanPull(false);
    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
  }, [canPull, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = { passive: false };

    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance >= threshold;

  return {
    containerRef,
    isRefreshing,
    isPulling,
    pullDistance,
    pullProgress,
    shouldTrigger,
  };
};
