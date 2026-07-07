import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';
import { OrderDetailsPanel } from '@/components/admin/orders/OrderDetailsPanel';
import {
  OrderStatsCards,
  AttentionBanner,
} from '@/components/admin/orders/OrderStatsCards';
import { OrderAnomaliesList } from '@/components/admin/orders/OrderAnomaliesList';
import { CheckoutSessionsTab } from '@/components/admin/orders/CheckoutSessionsTab';
import { useAdminOrders } from '@/hooks/admin/useAdminOrders';
import { ORDER_STATUS_CONFIG, type OrderStatus } from '@/types/order.types';
import { AddOrderDialog } from '@/components/admin/AddOrderDialog';
import { ManualTestOrderStatus } from '@/components/admin/ManualTestOrderStatus';
import { OrderEmailActions, type OrderEmailType } from '@/components/admin/orders/OrderEmailActions';
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from '@/components/admin/AdminDataTable';
import {
  Search,
  AlertTriangle,
  RefreshCw,
  X,
  TestTube2,
  ShoppingCart,
  Package,
  Loader2,
} from 'lucide-react';

type OrderRow = ReturnType<typeof useAdminOrders>['paginatedOrders'][number];

export default function AdminOrders() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sendingEmails, setSendingEmails] = useState<Set<OrderEmailType>>(
    () => new Set()
  );
  const handleEmailSendingChange = (type: OrderEmailType, sending: boolean) => {
    setSendingEmails((prev) => {
      const next = new Set(prev);
      if (sending) next.add(type);
      else next.delete(type);
      return next;
    });
  };
  const isAnyEmailSending = sendingEmails.size > 0;

  const {
    orders,
    paginatedOrders,
    isLoading,
    error,
    refetch,
    refresh,
    filters,
    searchValue,
    setSearchValue,
    setStatusFilter,
    setAnomalyFilter,
    clearFilters,
    hasActiveFilters,
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    totalItems,
    itemsPerPage,
    goToPage,
    setItemsPerPage,
  } = useAdminOrders();

  const columns = useMemo<AdminDataTableColumn<OrderRow>[]>(
    () => [
      {
        id: 'order',
        header: 'Commande',
        sortAccessor: (row) => row.id,
        cell: (row) => (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {row.id.slice(0, 8).toUpperCase()}
              </span>
              {row.has_anomaly && (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
            {row.order_items && row.order_items.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {row.order_items.length} article(s)
              </span>
            )}
          </>
        ),
      },
      {
        id: 'status',
        header: 'Statut',
        sortAccessor: (row) => row.order_status ?? '',
        cell: (row) => (
          <OrderStatusBadge
            status={row.order_status as OrderStatus}
            size="sm"
          />
        ),
      },
      {
        id: 'amount',
        header: 'Montant',
        sortAccessor: (row) => row.amount ?? 0,
        cell: (row) => (
          <span className="font-medium">
            {((row.amount || 0) / 100).toFixed(2)} €
          </span>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        sortAccessor: (row) => new Date(row.created_at),
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.created_at), 'dd MMM', { locale: fr })}
          </span>
        ),
      },
      {
        id: 'attention',
        header: '',
        className: 'w-[50px]',
        cell: (row) =>
          row.requires_attention ? (
            <Badge
              variant="destructive"
              className="h-6 w-6 p-0 justify-center"
            >
              !
            </Badge>
          ) : null,
      },
    ],
    []
  );

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Commandes</h1>
            <p className="text-muted-foreground">
              Suivi complet du cycle de vie des commandes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AddOrderDialog onOrderAdded={() => refetch()} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Tests Emails
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-popover border shadow-lg"
              >
                <DropdownMenuLabel>Tests d'emails</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 flex flex-col gap-2">
                  <OrderEmailActions mode="test" />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <ManualTestOrderStatus />

            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList>
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="checkouts" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Sessions Checkout
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            <AttentionBanner />
            <OrderStatsCards />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par ID ou numéro de suivi..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                onValueChange={setStatusFilter}
                value={filters.status?.[0] || 'all'}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(ORDER_STATUS_CONFIG).map(
                    ([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.labelFr}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select onValueChange={setAnomalyFilter} defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer anomalies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="anomalies">Avec anomalies</SelectItem>
                  <SelectItem value="attention">Attention requise</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              )}
            </div>

            {/* Main Content - Split View */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AdminDataTable
                  data={paginatedOrders}
                  columns={columns}
                  getRowId={(row) => row.id}
                  isLoading={isLoading}
                  error={error}
                  onRetry={refresh}
                  emptyMessage="Aucune commande trouvée"
                  selectedRowId={selectedOrderId}
                  onRowClick={(row) => setSelectedOrderId(row.id)}
                  rowClassName={(row) =>
                    row.requires_attention
                      ? 'bg-orange-50/50 dark:bg-orange-950/20'
                      : undefined
                  }
                  pagination={
                    orders.length > 0
                      ? {
                          mode: 'controlled',
                          currentPage,
                          totalPages,
                          startIndex,
                          endIndex,
                          totalItems,
                          itemsPerPage,
                          onPageChange: goToPage,
                          onItemsPerPageChange: setItemsPerPage,
                        }
                      : undefined
                  }
                />
              </div>

              <div className="hidden lg:block">
                <OrderAnomaliesList compact />
              </div>
            </div>

            <Sheet
              open={!!selectedOrderId}
              onOpenChange={() => setSelectedOrderId(null)}
            >
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader className="sr-only">
                  <SheetTitle>Détails de la commande</SheetTitle>
                </SheetHeader>
                {selectedOrderId && (
                  <OrderDetailsPanel
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                  />
                )}
              </SheetContent>
            </Sheet>
          </TabsContent>

          <TabsContent value="checkouts">
            <CheckoutSessionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
