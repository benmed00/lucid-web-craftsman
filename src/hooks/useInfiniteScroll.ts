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
  const [visibleItems, setVisibleItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when items change
  useEffect(() => {
    setCurrentPage(1);
    setVisibleItems(items.slice(0, itemsPerPage));
    setHasMore(items.length > itemsPerPage);
  }, [items, itemsPerPage]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const startIndex = currentPage * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const newItems = items.slice(startIndex, endIndex);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setVisibleItems(prev => [...prev, ...newItems]);
        setCurrentPage(prev => prev + 1);
        setHasMore(endIndex < items.length);
      }
      
      setIsLoading(false);
    }, 300);
  }, [items, currentPage, itemsPerPage, isLoading, hasMore]);

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