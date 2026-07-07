/**
 * AdminDataTable — wrapper de tableau générique pour la zone /admin.
 *
 * Centralise :
 *  - le rendu Table (shadcn) via une définition déclarative de colonnes,
 *  - le tri par colonne (asc/desc/none, tri client-side),
 *  - les états loading (skeletons), empty (message), error (message + retry),
 *  - la pagination via TablePagination + usePagination (option interne)
 *    OU une pagination pilotée par le parent (option contrôlée),
 *  - la sélection de ligne (highlight + onRowClick).
 *
 * Reste purement présentationnel : la data source est fournie par le hook
 * admin dédié (useAdminOrders, useAdminProducts, ...).
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import TablePagination from '@/components/admin/TablePagination';

export type SortDirection = 'asc' | 'desc' | null;

export interface AdminDataTableColumn<T> {
  /** Identifiant unique — sert de key React et d'état de tri. */
  id: string;
  /** En-tête de colonne. */
  header: ReactNode;
  /** Fonction de rendu de cellule. */
  cell: (row: T, rowIndex: number) => ReactNode;
  /** Accesseur pour trier — retour comparable (string/number/Date). */
  sortAccessor?: (row: T) => string | number | Date | null | undefined;
  /** Classes CSS optionnelles (largeur, alignement…). */
  className?: string;
  headerClassName?: string;
}

export interface AdminDataTableProps<T> {
  data: T[];
  columns: AdminDataTableColumn<T>[];
  getRowId: (row: T) => string | number;

  // États
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  loadingRowCount?: number;

  // Sélection
  selectedRowId?: string | number | null;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;

  // Tri initial
  initialSort?: { columnId: string; direction: Exclude<SortDirection, null> };

  // Pagination : mode "interne" (par défaut) OU mode "contrôlé"
  pagination?:
    | { mode?: 'internal'; itemsPerPage?: number; enabled?: boolean }
    | {
        mode: 'controlled';
        currentPage: number;
        totalPages: number;
        startIndex: number;
        endIndex: number;
        totalItems: number;
        itemsPerPage: number;
        onPageChange: (page: number) => void;
        onItemsPerPageChange: (count: number) => void;
      };
}

export function AdminDataTable<T>({
  data,
  columns,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyMessage = 'Aucun élément trouvé',
  loadingRowCount = 5,
  selectedRowId = null,
  onRowClick,
  rowClassName,
  initialSort,
  pagination,
}: AdminDataTableProps<T>) {
  const [sortState, setSortState] = useState<{
    columnId: string | null;
    direction: SortDirection;
  }>(
    initialSort
      ? { columnId: initialSort.columnId, direction: initialSort.direction }
      : { columnId: null, direction: null }
  );

  const sortedData = useMemo(() => {
    if (!sortState.columnId || !sortState.direction) return data;
    const col = columns.find((c) => c.id === sortState.columnId);
    if (!col?.sortAccessor) return data;
    const accessor = col.sortAccessor;
    const dir = sortState.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va instanceof Date && vb instanceof Date) {
        return (va.getTime() - vb.getTime()) * dir;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [data, columns, sortState]);

  const toggleSort = (columnId: string, sortable: boolean) => {
    if (!sortable) return;
    setSortState((prev) => {
      if (prev.columnId !== columnId) {
        return { columnId, direction: 'asc' };
      }
      if (prev.direction === 'asc') return { columnId, direction: 'desc' };
      if (prev.direction === 'desc') return { columnId: null, direction: null };
      return { columnId, direction: 'asc' };
    });
  };

  // Pagination interne facultative
  const internalPaginationEnabled =
    !pagination || pagination.mode !== 'controlled';
  const internalItemsPerPage =
    internalPaginationEnabled && pagination && 'itemsPerPage' in pagination
      ? (pagination.itemsPerPage ?? 10)
      : 10;
  const internalEnabled =
    internalPaginationEnabled &&
    (pagination as { enabled?: boolean } | undefined)?.enabled !== false;

  const internalPagination = usePagination({
    items: sortedData,
    itemsPerPage: internalItemsPerPage,
  });

  const rowsToRender = internalEnabled
    ? internalPagination.paginatedItems
    : sortedData;

  const columnCount = columns.length;

  return (
    <div className="rounded-lg border bg-card">
      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">Impossible de charger les données</p>
            <p className="text-sm text-muted-foreground">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          </div>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="p-4 space-y-4">
          {Array.from({ length: loadingRowCount }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => {
                  const sortable = Boolean(col.sortAccessor);
                  const isActive = sortState.columnId === col.id;
                  return (
                    <TableHead
                      key={col.id}
                      className={cn(col.headerClassName, col.className)}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.id, sortable)}
                          className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        >
                          {col.header}
                          {isActive && sortState.direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : isActive && sortState.direction === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowsToRender.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                rowsToRender.map((row, rowIndex) => {
                  const id = getRowId(row);
                  const selected = selectedRowId === id;
                  return (
                    <TableRow
                      key={id}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={cn(
                        onRowClick && 'cursor-pointer hover:bg-muted/50',
                        selected && 'bg-muted',
                        rowClassName?.(row)
                      )}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.id} className={col.className}>
                          {col.cell(row, rowIndex)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination && pagination.mode === 'controlled' ? (
            <div className="px-4 border-t">
              <TablePagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.onPageChange}
                onItemsPerPageChange={pagination.onItemsPerPageChange}
              />
            </div>
          ) : internalEnabled && sortedData.length > 0 ? (
            <div className="px-4 border-t">
              <TablePagination
                currentPage={internalPagination.currentPage}
                totalPages={internalPagination.totalPages}
                totalItems={internalPagination.totalItems}
                startIndex={internalPagination.startIndex}
                endIndex={internalPagination.endIndex}
                itemsPerPage={internalPagination.itemsPerPage}
                onPageChange={internalPagination.goToPage}
                onItemsPerPageChange={internalPagination.setItemsPerPage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default AdminDataTable;
