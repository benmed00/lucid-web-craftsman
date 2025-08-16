import { useState, useEffect } from 'react';
import { stockService, StockInfo } from '@/services/stockService';

export interface UseStockOptions {
  productId?: number;
  productIds?: number[];
  enabled?: boolean;
}

// Overloads for different usage patterns
export function useStock(options: { productId: number; enabled?: boolean }): {
  stockInfo: StockInfo | null;
  loading: boolean;
  error: string | null;
  canOrderQuantity: (productId: number, quantity: number) => Promise<{ canOrder: boolean; reason?: string }>;
  reserveStock: (items: Array<{ productId: number; quantity: number }>) => Promise<{ success: boolean; errors?: Array<{ productId: number; error: string }> }>;
  updateStock: (update: { productId: number; quantity: number; type: 'add' | 'remove' | 'set'; reason?: string }) => Promise<void>;
};

export function useStock(options: { productIds: number[]; enabled?: boolean }): {
  stockInfo: Record<number, StockInfo>;
  loading: boolean;
  error: string | null;
  canOrderQuantity: (productId: number, quantity: number) => Promise<{ canOrder: boolean; reason?: string }>;
  reserveStock: (items: Array<{ productId: number; quantity: number }>) => Promise<{ success: boolean; errors?: Array<{ productId: number; error: string }> }>;
  updateStock: (update: { productId: number; quantity: number; type: 'add' | 'remove' | 'set'; reason?: string }) => Promise<void>;
};

export function useStock(options: UseStockOptions = {}): any {
  const [stockInfo, setStockInfo] = useState<StockInfo | Record<number, StockInfo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { productId, productIds, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const fetchStockInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        if (productId) {
          // Single product
          const info = await stockService.getStockInfo(productId);
          setStockInfo(info);
        } else if (productIds && productIds.length > 0) {
          // Multiple products
          const info = await stockService.getMultipleStockInfo(productIds);
          setStockInfo(info);
        } else {
          setStockInfo(null);
        }
      } catch (err) {
        console.error('Error fetching stock info:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement du stock');
        setStockInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStockInfo();
  }, [productId, productIds, enabled]);

  const canOrderQuantity = async (productId: number, quantity: number) => {
    try {
      return await stockService.canOrderQuantity(productId, quantity);
    } catch (err) {
      console.error('Error checking order quantity:', err);
      return { canOrder: false, reason: 'Erreur lors de la vérification' };
    }
  };

  const reserveStock = async (items: Array<{ productId: number; quantity: number }>) => {
    try {
      return await stockService.reserveStock(items);
    } catch (err) {
      console.error('Error reserving stock:', err);
      return { success: false, errors: [{ productId: 0, error: 'Erreur de réservation' }] };
    }
  };

  const updateStock = async (update: { productId: number; quantity: number; type: 'add' | 'remove' | 'set'; reason?: string }) => {
    try {
      await stockService.updateStock(update);
      // Refresh stock info after update
      if (productId === update.productId) {
        const info = await stockService.getStockInfo(update.productId);
        setStockInfo(info);
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      throw err;
    }
  };

  return {
    stockInfo,
    loading,
    error,
    canOrderQuantity,
    reserveStock,
    updateStock
  };
};