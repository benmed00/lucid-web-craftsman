import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollProps<T> {
  items: T[];
  itemsPerPage?: number;
  threshold?: number;
}

interface UseInfiniteScrollReturn<T> {
  visibleItems: T[];
  hasMore: boolean;
  isLoading: boolean;
  sentinelRef: React.RefObject<HTMLDivElement>;
  loadMore: () => void;
}

export function useInfiniteScroll<T>({ 
  items, 
  itemsPerPage = 12, 
  threshold = 0.8 
}: UseInfiniteScrollProps<T>): UseInfiniteScrollReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prevItemsRef = useRef<T[]>([]);

  // Calculate visible items and hasMore based on currentPage
  const endIndex = currentPage * itemsPerPage;
  const visibleItems = items.slice(0, endIndex);
  const hasMore = endIndex < items.length;

  // Reset pagination only when items array actually changes (by reference or length)
  useEffect(() => {
    const itemsChanged = items !== prevItemsRef.current && 
      (items.length !== prevItemsRef.current.length || 
       items[0] !== prevItemsRef.current[0]);
    
    if (itemsChanged) {
      setCurrentPage(1);
      prevItemsRef.current = items;
    }
  }, [items]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1);
      setIsLoading(false);
    }, 300);
  }, [isLoading, hasMore]);

  // Intersection Observer setup
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin: '100px',
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, loadMore, threshold]);

  return {
    visibleItems,
    hasMore,
    isLoading,
    sentinelRef,
    loadMore,
  };
};