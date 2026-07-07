/**
 * useAdminOrders — hook partagé pour la page /admin/orders.
 *
 * Regroupe : état des filtres + recherche debouncée, requête React Query
 * (via useOrders), abonnement realtime, pagination, et helpers de filtrage.
 * Permet à la page d'être purement présentationnelle.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useOrders,
  useOrderRealtimeUpdates,
} from '@/hooks/useOrderManagement';
import { usePagination } from '@/hooks/usePagination';
import { handleSupabaseError } from '@/lib/supabaseErrorHandler';
import type { OrderFilters, OrderStatus } from '@/types/order.types';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 15;

export interface UseAdminOrdersOptions {
  initialFilters?: OrderFilters;
  itemsPerPage?: number;
}

export function useAdminOrders(options: UseAdminOrdersOptions = {}) {
  const { initialFilters = {}, itemsPerPage = DEFAULT_PAGE_SIZE } = options;

  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [searchValue, setSearchValue] = useState('');

  const query = useOrders(filters);
  const orders = query.data ?? [];

  // Harmonise les toasts d'erreur de fetch (fenêtre de dédup 3s dans le handler).
  const lastReportedError = useRef<unknown>(null);
  useEffect(() => {
    if (query.error && query.error !== lastReportedError.current) {
      lastReportedError.current = query.error;
      handleSupabaseError(query.error, 'admin/orders:fetch');
    }
  }, [query.error]);

  const { subscribe } = useOrderRealtimeUpdates();

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const setStatusFilter = useCallback((status: string) => {
    setFilters((prev) =>
      status === 'all'
        ? { ...prev, status: undefined }
        : { ...prev, status: [status as OrderStatus] }
    );
  }, []);

  const setAnomalyFilter = useCallback((value: string) => {
    setFilters((prev) => {
      if (value === 'anomalies') {
        return { ...prev, hasAnomaly: true, requiresAttention: undefined };
      }
      if (value === 'attention') {
        return { ...prev, hasAnomaly: undefined, requiresAttention: true };
      }
      return { ...prev, hasAnomaly: undefined, requiresAttention: undefined };
    });
  }, []);

  const setDateRange = useCallback(
    (from: Date | undefined, to: Date | undefined) => {
      setFilters((prev) => ({
        ...prev,
        dateFrom: from ? from.toISOString() : undefined,
        // Inclut la journée entière du "to"
        dateTo: to
          ? new Date(
              to.getFullYear(),
              to.getMonth(),
              to.getDate(),
              23,
              59,
              59,
              999
            ).toISOString()
          : undefined,
      }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchValue('');
  }, []);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((v) => v !== undefined),
    [filters]
  );

  const refresh = useCallback(() => {
    query.refetch();
    queryClient.invalidateQueries({ queryKey: ['order-stats'] });
    queryClient.invalidateQueries({ queryKey: ['order-anomalies'] });
  }, [query, queryClient]);

  const pagination = usePagination({ items: orders, itemsPerPage });

  return {
    // Data
    orders,
    paginatedOrders: pagination.paginatedItems,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    refresh,

    // Filter state
    filters,
    searchValue,
    setSearchValue,
    setStatusFilter,
    setAnomalyFilter,
    setDateRange,
    clearFilters,
    hasActiveFilters,

    // Pagination (destructure convenience)
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    startIndex: pagination.startIndex,
    endIndex: pagination.endIndex,
    totalItems: pagination.totalItems,
    itemsPerPage: pagination.itemsPerPage,
    goToPage: pagination.goToPage,
    setItemsPerPage: pagination.setItemsPerPage,
  };
}
