import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { OrderStatusBadge } from '@/components/admin/orders/OrderStatusBadge';
import { OrderDetailsPanel } from '@/components/admin/orders/OrderDetailsPanel';
import { OrderStatsCards, AttentionBanner } from '@/components/admin/orders/OrderStatsCards';
import { OrderAnomaliesList } from '@/components/admin/orders/OrderAnomaliesList';
import { useOrders, useOrderRealtimeUpdates } from '@/hooks/useOrderManagement';
import { ORDER_STATUS_CONFIG, type OrderStatus, type OrderFilters } from '@/types/order.types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminOrdersEnhanced() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();
  const { data: orders = [], isLoading, refetch } = useOrders(filters);
  const { subscribe } = useOrderRealtimeUpdates();

  // Set up real-time updates
  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchValue || undefined }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue]);

  const handleStatusFilter = (status: string) => {
    if (status === 'all') {
      setFilters((prev) => ({ ...prev, status: undefined }));
    } else {
      setFilters((prev) => ({ ...prev, status: [status as OrderStatus] }));
    }
  };

  const handleAnomalyFilter = (value: string) => {
    if (value === 'all') {
      setFilters((prev) => ({ ...prev, hasAnomaly: undefined, requiresAttention: undefined }));
    } else if (value === 'anomalies') {
      setFilters((prev) => ({ ...prev, hasAnomaly: true, requiresAttention: undefined }));
    } else if (value === 'attention') {
      setFilters((prev) => ({ ...prev, hasAnomaly: undefined, requiresAttention: true }));
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchValue('');
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des Commandes</h1>
            <p className="text-muted-foreground">
              Suivi complet du cycle de vie des commandes
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['order-stats'] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Attention Banner */}
        <AttentionBanner />

        {/* Stats Cards */}
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

          <Select onValueChange={handleStatusFilter} value={filters.status?.[0] || 'all'}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                <SelectItem key={status} value={status}>
                  {config.labelFr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleAnomalyFilter} defaultValue="all">
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
          {/* Orders Table */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commande</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedOrderId === order.id ? 'bg-muted' : ''
                        } ${order.requires_attention ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {order.id.slice(0, 8).toUpperCase()}
                            </span>
                            {order.has_anomaly && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          {order.order_items && order.order_items.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {order.order_items.length} article(s)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge 
                            status={order.order_status as OrderStatus} 
                            size="sm" 
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {((order.amount || 0) / 100).toFixed(2)} €
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM', { locale: fr })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order.requires_attention && (
                            <Badge variant="destructive" className="h-6 w-6 p-0 justify-center">
                              !
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}

                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Aucune commande trouvée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Sidebar - Anomalies Overview */}
          <div className="hidden lg:block">
            <OrderAnomaliesList compact />
          </div>
        </div>

        {/* Order Details Sheet */}
        <Sheet open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
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
      </div>
    </div>
  );
}
