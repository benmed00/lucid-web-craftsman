/**
 * Batch Stock Hook
 * Fetches stock info for multiple products in a single query to avoid N+1 pattern.
 * Used by Products page to provide stock context to all ProductCards.
 */

import { useState, useEffect, useMemo } from 'react';
import { stockService, StockInfo } from '@/services/stockService';

interface UseBatchStockOptions {
  productIds: number[];
  enabled?: boolean;
}

interface UseBatchStockReturn {
  stockMap: Record<number, StockInfo>;
  loading: boolean;
  error: string | null;
}

export function useBatchStock({
  productIds,
  enabled = true,
}: UseBatchStockOptions): UseBatchStockReturn {
  const [stockMap, setStockMap] = useState<Record<number, StockInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the product IDs string to prevent unnecessary re-fetches
  const productIdsKey = useMemo(() => productIds.sort().join(','), [productIds]);

  // Refetch on window focus for fresh stock data
  useEffect(() => {
    const handleFocus = () => {
      if (enabled && productIds.length > 0) {
        fetchBatchStock();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [productIdsKey, enabled]);

  const fetchBatchStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await stockService.getMultipleStockInfo(productIds);
      setStockMap(result);
    } catch (err) {
      console.error('[useBatchStock] Error fetching batch stock:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stock info');
      setStockMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled || productIds.length === 0) {
      setStockMap({});
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await stockService.getMultipleStockInfo(productIds);
        if (!cancelled) setStockMap(result);
      } catch (err) {
        console.error('[useBatchStock] Error fetching batch stock:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch stock info');
          setStockMap({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeoutId = setTimeout(doFetch, 100);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [productIdsKey, enabled]);

  return { stockMap, loading, error };
}
