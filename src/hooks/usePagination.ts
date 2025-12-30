import { useState, useMemo, useCallback } from 'react';

interface UsePaginationProps<T> {
  items: T[];
  itemsPerPage?: number;
}

interface UsePaginationResult<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
}

export const usePagination = <T>({
  items,
  itemsPerPage: initialItemsPerPage = 10,
}: UsePaginationProps<T>): UsePaginationResult<T> => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Reset to page 1 if items change and current page is out of bounds
  const validatedCurrentPage = useMemo(() => {
    if (currentPage > totalPages) {
      return 1;
    }
    return currentPage;
  }, [currentPage, totalPages]);

  const startIndex = (validatedCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const hasNextPage = validatedCurrentPage < totalPages;
  const hasPreviousPage = validatedCurrentPage > 1;

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const handleSetItemsPerPage = useCallback((count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1); // Reset to first page when changing items per page
  }, []);

  return {
    currentPage: validatedCurrentPage,
    totalPages,
    paginatedItems,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    startIndex,
    endIndex,
    totalItems,
    itemsPerPage,
    setItemsPerPage: handleSetItemsPerPage,
  };
};
