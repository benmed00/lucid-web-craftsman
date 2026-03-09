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

  useEffect(() => {
    if (!enabled || productIds.length === 0) {
      setStockMap({});
      return;
    }

    let cancelled = false;

    const fetchBatchStock = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await stockService.getMultipleStockInfo(productIds);
        if (!cancelled) {
          setStockMap(result);
        }
      } catch (err) {
        console.error('[useBatchStock] Error fetching batch stock:', err);
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to fetch stock info'
          );
          setStockMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Debounce to handle rapid product list changes
    const timeoutId = setTimeout(fetchBatchStock, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [productIdsKey, enabled]);

  return { stockMap, loading, error };
}
