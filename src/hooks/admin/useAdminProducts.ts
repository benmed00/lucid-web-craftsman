/**
 * useAdminProducts — hook partagé pour la page /admin/products.
 *
 * Remplace le pattern useState + useEffect + ProductService.getAllProducts par
 * React Query, avec état de filtres/recherche, pagination et mutation de mise
 * à jour centralisée.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProductService } from '@/services/productService';
import { updateAdminProductReturnRow } from '@/services/adminProductsApi';
import { usePagination } from '@/hooks/usePagination';
import { useAuditLog } from '@/hooks/useAuditLog';
import { handleSupabaseError } from '@/lib/supabaseErrorHandler';
import type { Product } from '@/shared/interfaces/Iproduct.interface';
import type { Database } from '@/integrations/supabase/types';

type ProductUpdate = Database['public']['Tables']['products']['Update'];

export const ADMIN_PRODUCTS_QUERY_KEY = ['admin', 'products'] as const;
const DEFAULT_PAGE_SIZE = 12;

export interface UseAdminProductsOptions {
  itemsPerPage?: number;
}

export function useAdminProducts(options: UseAdminProductsOptions = {}) {
  const { itemsPerPage = DEFAULT_PAGE_SIZE } = options;

  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const query = useQuery<Product[]>({
    queryKey: ADMIN_PRODUCTS_QUERY_KEY,
    queryFn: () => ProductService.getAllProducts(),
  });

  const products = query.data ?? [];

  // Harmonise les toasts d'erreur de fetch (dédupliqués par le handler global).
  const lastReportedError = useRef<unknown>(null);
  useEffect(() => {
    if (query.error && query.error !== lastReportedError.current) {
      lastReportedError.current = query.error;
      handleSupabaseError(query.error, 'admin/products:fetch');
    }
  }, [query.error]);

  const filteredProducts = useMemo(() => {
    const needle = searchQuery.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.artisan?.toLowerCase().includes(needle);
      const matchesCategory =
        filterCategory === 'all' ||
        product.category.toLowerCase() === filterCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, filterCategory]);

  const pagination = usePagination({
    items: filteredProducts,
    itemsPerPage,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
  }, [queryClient]);

  const updateProduct = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: ProductUpdate;
    }) => {
      const data = await updateAdminProductReturnRow(
        id,
        payload as Record<string, unknown>
      );
      return data as Product;
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<Product[]>(ADMIN_PRODUCTS_QUERY_KEY, (prev) =>
        prev
          ? prev.map((p) => (p.id === variables.id ? updated : p))
          : prev
      );
      toast.success('Produit modifié avec succès');
      logAction('UPDATE_PRODUCT', 'products', variables.id.toString());
    },
    onError: (error) => {
      console.error('Error saving product:', error);
      const handled = handleSupabaseError(error, 'admin/products:update');
      if (!handled) {
        toast.error('Erreur lors de la sauvegarde du produit');
      }
    },
  });

  return {
    // Data
    products,
    filteredProducts,
    paginatedProducts: pagination.paginatedItems,
    isLoading: query.isLoading,
    error: query.error,
    refresh,

    // Filter state
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,

    // Mutations
    updateProduct: updateProduct.mutateAsync,
    isUpdating: updateProduct.isPending,

    // Pagination
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
