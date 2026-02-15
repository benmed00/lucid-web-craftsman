import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, Search, Eye, RefreshCw, Mail, Phone, MapPin, Calendar,
  ShoppingBag, Star, ChevronLeft, ChevronRight, Download, TrendingUp, Award, Package, ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddClientDialog } from "@/components/admin/AddClientDialog";
import { useCurrency } from "@/stores/currencyStore";

interface CustomerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  city: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  product_id: number | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: Record<string, unknown> | null;
}

interface CustomerOrder {
  id: string;
  amount: number | null;
  status: string | null;
  order_status: string | null;
  created_at: string;
  payment_method: string | null;
  tracking_number: string | null;
  carrier: string | null;
  items?: OrderItem[];
}

interface CartItem {
  id: string;
  product_id: number | null;
  quantity: number;
  created_at: string;
  product_name?: string;
}

interface LoyaltyInfo {
  points_balance: number;
  tier: string;
  total_points_earned: number;
}

interface CustomerStats {
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  avg_order_value: number;
}

interface Customer extends CustomerProfile {
  email?: string;
  stats: CustomerStats;
  status: 'active' | 'inactive' | 'premium';
  loyalty?: LoyaltyInfo | null;
  orders?: CustomerOrder[];
  cart_items?: CartItem[];
}

const ITEMS_PER_PAGE = 15;

const AdminCustomers = () => {
  const { formatPrice } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'created_at' | 'total_spent' | 'total_orders'>('created_at');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // Batch fetch: profiles + all orders + loyalty points in parallel
      const [profilesRes, ordersRes, loyaltyRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('id, user_id, amount, status, order_status, created_at'),
        supabase.from('loyalty_points').select('user_id, points_balance, tier, total_points_earned')
      ]);

      if (profilesRes.error) throw profilesRes.error;

      // Fetch emails for all profile IDs via admin RPC
      const profileIds = (profilesRes.data || []).map(p => p.id);
      const emailsByUser = new Map<string, string>();
      
      if (profileIds.length > 0) {
        const { data: emailData } = await supabase.rpc('get_user_emails_for_admin', {
          p_user_ids: profileIds
        });
        (emailData || []).forEach((e: { user_id: string; email: string }) => {
          emailsByUser.set(e.user_id, e.email);
        });
      }

      // Index orders by user_id
      const ordersByUser = new Map<string, typeof ordersRes.data>();
      (ordersRes.data || []).forEach(order => {
        if (!order.user_id) return;
        const existing = ordersByUser.get(order.user_id) || [];
        existing.push(order);
        ordersByUser.set(order.user_id, existing);
      });

      // Index loyalty by user_id
      const loyaltyByUser = new Map<string, LoyaltyInfo>();
      (loyaltyRes.data || []).forEach(lp => {
        loyaltyByUser.set(lp.user_id, {
          points_balance: lp.points_balance,
          tier: lp.tier,
          total_points_earned: lp.total_points_earned
        });
      });

      const customersWithStats = (profilesRes.data || []).map(profile => {
        const userOrders = ordersByUser.get(profile.id) || [];
        // Count all orders except explicitly failed ones
        const countableStatuses = ['paid', 'validated', 'preparing', 'shipped', 'in_transit', 'delivered', 'processing'];
        const validOrders = userOrders.filter(o =>
          countableStatuses.includes(o.order_status || o.status || '')
        );

        const totalOrders = validOrders.length;
        const totalSpent = validOrders.reduce((sum, o) => sum + ((o.amount || 0) / 100), 0);
        const sorted = [...userOrders].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastOrderDate = sorted.length > 0 ? sorted[0].created_at : null;
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        let status: 'active' | 'inactive' | 'premium' = 'inactive';
        if (totalSpent > 500) status = 'premium';
        else if (userOrders.length > 0) status = 'active';

        return {
          ...profile,
          email: emailsByUser.get(profile.id),
          stats: { total_orders: totalOrders, total_spent: totalSpent, last_order_date: lastOrderDate, avg_order_value: avgOrderValue },
          status,
          loyalty: loyaltyByUser.get(profile.id) || null
        } as Customer;
      });

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Open detail & fetch orders with items + cart for selected customer
  const openCustomerDetail = useCallback(async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const [ordersRes, cartRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id, amount, status, order_status, created_at, payment_method, tracking_number, carrier,
            order_items (id, product_id, quantity, unit_price, total_price, product_snapshot)
          `)
          .eq('user_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('cart_items')
          .select('id, product_id, quantity, created_at')
          .eq('user_id', customer.id)
      ]);

      const orders: CustomerOrder[] = (ordersRes.data || []).map((o: Record<string, unknown>) => ({
        id: o.id as string,
        amount: o.amount as number | null,
        status: o.status as string | null,
        order_status: o.order_status as string | null,
        created_at: o.created_at as string,
        payment_method: o.payment_method as string | null,
        tracking_number: o.tracking_number as string | null,
        carrier: o.carrier as string | null,
        items: (o.order_items as OrderItem[]) || [],
      }));

      // Enrich cart items with product names from products table
      let cartItems: CartItem[] = (cartRes.data || []).map(c => ({
        id: c.id,
        product_id: c.product_id,
        quantity: c.quantity,
        created_at: c.created_at,
      }));

      if (cartItems.length > 0) {
        const productIds = cartItems.map(c => c.product_id).filter(Boolean) as number[];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          const productMap = new Map((products || []).map(p => [p.id, p.name]));
          cartItems = cartItems.map(c => ({
            ...c,
            product_name: c.product_id ? productMap.get(c.product_id) || `Produit #${c.product_id}` : 'Inconnu'
          }));
        }
      }

      setSelectedCustomer(prev => prev ? { ...prev, orders, cart_items: cartItems } : null);
    } catch (e) {
      console.error('Error fetching customer details:', e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Filter + sort
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(customer => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (customer.full_name?.toLowerCase() || '').includes(q) ||
        customer.id.toLowerCase().includes(q) ||
        (customer.email?.toLowerCase() || '').includes(q) ||
        (customer.phone?.toLowerCase() || '').includes(q) ||
        (customer.city?.toLowerCase() || '').includes(q);
      const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'total_spent') return b.stats.total_spent - a.stats.total_spent;
      if (sortBy === 'total_orders') return b.stats.total_orders - a.stats.total_orders;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [customers, searchQuery, filterStatus, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, sortBy]);

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const premiumCustomers = customers.filter(c => c.status === 'premium').length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.stats.total_spent, 0);

  const getStatusBadge = (status: 'active' | 'inactive' | 'premium') => {
    switch (status) {
      case 'premium': return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Premium</Badge>;
      case 'active': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Actif</Badge>;
      case 'inactive': return <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>;
    }
  };

  const ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
    created: { label: 'Créée', className: 'bg-slate-500/20 text-slate-400' },
    payment_pending: { label: 'Paiement en attente', className: 'bg-yellow-500/20 text-yellow-400' },
    payment_failed: { label: 'Paiement échoué', className: 'bg-red-500/20 text-red-400' },
    paid: { label: 'Payée', className: 'bg-blue-500/20 text-blue-400' },
    validation_in_progress: { label: 'En validation', className: 'bg-indigo-500/20 text-indigo-400' },
    validated: { label: 'Validée', className: 'bg-indigo-500/20 text-indigo-400' },
    preparing: { label: 'En préparation', className: 'bg-purple-500/20 text-purple-400' },
    shipped: { label: 'Expédiée', className: 'bg-purple-500/20 text-purple-400' },
    in_transit: { label: 'En transit', className: 'bg-violet-500/20 text-violet-400' },
    delivered: { label: 'Livrée', className: 'bg-emerald-500/20 text-emerald-400' },
    delivery_failed: { label: 'Échec livraison', className: 'bg-red-500/20 text-red-400' },
    cancelled: { label: 'Annulée', className: 'bg-red-500/20 text-red-400' },
    refunded: { label: 'Remboursée', className: 'bg-orange-500/20 text-orange-400' },
    return_requested: { label: 'Retour demandé', className: 'bg-orange-500/20 text-orange-400' },
    returned: { label: 'Retournée', className: 'bg-orange-500/20 text-orange-400' },
    archived: { label: 'Archivée', className: 'bg-muted text-muted-foreground' },
  };

  const getOrderStatusBadge = (status: string | null) => {
    const s = ORDER_STATUS_MAP[status || ''] || { label: status || 'Inconnu', className: 'bg-muted text-muted-foreground' };
    return <Badge className={s.className}>{s.label}</Badge>;
  };

  const getLoyaltyBadge = (tier: string) => {
    const map: Record<string, { label: string; className: string }> = {
      bronze: { label: '🥉 Bronze', className: 'bg-orange-500/20 text-orange-400' },
      silver: { label: '🥈 Argent', className: 'bg-slate-400/20 text-slate-300' },
      gold: { label: '🥇 Or', className: 'bg-amber-500/20 text-amber-300' },
      platinum: { label: '💎 Platine', className: 'bg-cyan-500/20 text-cyan-300' },
    };
    const t = map[tier] || { label: tier, className: 'bg-muted text-muted-foreground' };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  // CSV export
  const exportCSV = () => {
    const headers = ['Nom', 'Email', 'Téléphone', 'Ville', 'Pays', 'Commandes', 'CA Total', 'Statut', 'Inscription'];
    const rows = filteredCustomers.map(c => [
      c.full_name || 'Anonyme',
      c.email || '',
      c.phone || '',
      c.city || '',
      c.country || '',
      c.stats.total_orders,
      c.stats.total_spent.toFixed(2),
      c.status,
      format(new Date(c.created_at), 'yyyy-MM-dd')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredCustomers.length} clients exportés`);
  };

  const getInitials = (name: string | null) =>
    (name || 'C').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getProductName = (item: OrderItem): string => {
    if (item.product_snapshot && typeof item.product_snapshot === 'object') {
      const snap = item.product_snapshot as Record<string, unknown>;
      return (snap.name as string) || (snap.title as string) || `Produit #${item.product_id}`;
    }
    return `Produit #${item.product_id}`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-6">
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Clients</h1>
          <p className="text-muted-foreground">
            {totalCustomers} clients • {filteredCustomers.length} affichés
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter CSV
          </Button>
          <AddClientDialog onClientAdded={fetchCustomers} />
          <Button onClick={fetchCustomers} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold text-foreground">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Actifs</p>
                <p className="text-2xl font-bold text-emerald-400">{activeCustomers}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Premium</p>
                <p className="text-2xl font-bold text-amber-400">{premiumCustomers}</p>
              </div>
              <Star className="h-8 w-8 text-amber-400 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">CA total</p>
                <p className="text-2xl font-bold text-foreground">{formatPrice(totalRevenue)}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email, téléphone, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Plus récents</SelectItem>
                <SelectItem value="total_spent">Plus gros CA</SelectItem>
                <SelectItem value="total_orders">Plus de commandes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Client</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden md:table-cell">Contact</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden lg:table-cell">Inscription</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Commandes</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden md:table-cell">CA</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden lg:table-cell">Fidélité</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Statut</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={customer.avatar_url || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(customer.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {customer.full_name || 'Client anonyme'}
                          </p>
                          {customer.email ? (
                            <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">#{customer.id.slice(-8)}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{customer.city}{customer.country ? `, ${customer.country}` : ''}</span>
                          </div>
                        )}
                        {!customer.email && !customer.phone && !customer.city && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(customer.created_at), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-foreground">{customer.stats.total_orders}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.stats.last_order_date
                          ? `Dernière: ${format(new Date(customer.stats.last_order_date), 'dd/MM/yy', { locale: fr })}`
                          : 'Jamais'
                        }
                      </p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <p className="font-medium text-foreground">{formatPrice(customer.stats.total_spent)}</p>
                      {customer.stats.avg_order_value > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Moy: {formatPrice(customer.stats.avg_order_value)}
                        </p>
                      )}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      {customer.loyalty ? getLoyaltyBadge(customer.loyalty.tier) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(customer.status)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCustomerDetail(customer)}
                        className="gap-1.5"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Détail</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-medium text-foreground mb-1">Aucun client trouvé</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterStatus !== "all"
                  ? "Aucun client ne correspond à vos critères."
                  : "Vous n'avez pas encore de clients."
                }
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages} • {filteredCustomers.length} résultats
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <Button
                      key={page} variant={currentPage === page ? "default" : "outline"} size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedCustomer.avatar_url || ''} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {getInitials(selectedCustomer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedCustomer.full_name || 'Client anonyme'}
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Client depuis le {format(new Date(selectedCustomer.created_at), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                        {getStatusBadge(selectedCustomer.status)}
                        {selectedCustomer.loyalty && getLoyaltyBadge(selectedCustomer.loyalty.tier)}
                      </div>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Infos</TabsTrigger>
                  <TabsTrigger value="orders">
                    Commandes {selectedCustomer.orders ? `(${selectedCustomer.orders.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="cart">
                    Panier {selectedCustomer.cart_items && selectedCustomer.cart_items.length > 0
                      ? `(${selectedCustomer.cart_items.length})`
                      : ''
                    }
                  </TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" /> Contact
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span>{selectedCustomer.email || 'Non renseigné'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>{selectedCustomer.phone || 'Non renseigné'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Adresse
                      </h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selectedCustomer.address_line1 && <p>{selectedCustomer.address_line1}</p>}
                        {selectedCustomer.address_line2 && <p>{selectedCustomer.address_line2}</p>}
                        <p>
                          {[selectedCustomer.postal_code, selectedCustomer.city].filter(Boolean).join(' ') || 'Non renseignée'}
                        </p>
                        {selectedCustomer.country && <p>{selectedCustomer.country}</p>}
                      </div>
                    </div>
                  </div>

                  {selectedCustomer.bio && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Note</h4>
                        <p className="text-sm text-muted-foreground">{selectedCustomer.bio}</p>
                      </div>
                    </>
                  )}

                  {selectedCustomer.loyalty && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                          <Award className="h-4 w-4" /> Programme Fidélité
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-xl font-bold text-foreground">{selectedCustomer.loyalty.points_balance}</p>
                            <p className="text-xs text-muted-foreground">Points disponibles</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg">
                            <p className="text-xl font-bold text-foreground">{selectedCustomer.loyalty.total_points_earned}</p>
                            <p className="text-xs text-muted-foreground">Points cumulés</p>
                          </div>
                          <div className="text-center p-3 bg-muted/50 rounded-lg flex flex-col items-center justify-center">
                            {getLoyaltyBadge(selectedCustomer.loyalty.tier)}
                            <p className="text-xs text-muted-foreground mt-1">Niveau</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-4">
                  {detailLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCustomer.orders.map(order => (
                        <div key={order.id} className="rounded-lg bg-muted/30 border border-border overflow-hidden">
                          {/* Order header */}
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium text-foreground">#{order.id.slice(-8)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(order.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                  {order.payment_method && <span> • {order.payment_method}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getOrderStatusBadge(order.order_status || order.status)}
                              <span className="font-medium text-foreground text-sm">
                                {formatPrice((order.amount || 0) / 100)}
                              </span>
                            </div>
                          </div>

                          {/* Order items */}
                          {order.items && order.items.length > 0 && (
                            <div className="border-t border-border px-3 py-2 bg-muted/20">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                                {order.items.length} article{order.items.length > 1 ? 's' : ''}
                              </p>
                              <div className="space-y-1">
                                {order.items.map(item => (
                                  <div key={item.id} className="flex items-center justify-between text-xs">
                                    <span className="text-foreground truncate max-w-[60%]">
                                      {getProductName(item)} × {item.quantity}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatPrice(item.total_price / 100)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tracking info */}
                          {order.tracking_number && (
                            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                              📦 {order.carrier || 'Transporteur'}: {order.tracking_number}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-muted-foreground text-sm">Aucune commande</p>
                    </div>
                  )}
                </TabsContent>

                {/* Cart Tab */}
                <TabsContent value="cart" className="mt-4">
                  {detailLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : selectedCustomer.cart_items && selectedCustomer.cart_items.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground mb-3">
                        {selectedCustomer.cart_items.length} article{selectedCustomer.cart_items.length > 1 ? 's' : ''} dans le panier
                      </p>
                      {selectedCustomer.cart_items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                          <div className="flex items-center gap-3">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.product_name || `Produit #${item.product_id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Ajouté le {format(new Date(item.created_at), 'dd MMM yyyy', { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">× {item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-muted-foreground text-sm">Panier vide</p>
                    </div>
                  )}
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-foreground">{selectedCustomer.stats.total_orders}</p>
                      <p className="text-sm text-muted-foreground">Commandes totales</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-foreground">{formatPrice(selectedCustomer.stats.total_spent)}</p>
                      <p className="text-sm text-muted-foreground">Dépenses totales</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-3xl font-bold text-foreground">{formatPrice(selectedCustomer.stats.avg_order_value)}</p>
                      <p className="text-sm text-muted-foreground">Panier moyen</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-lg font-bold text-foreground">
                        {selectedCustomer.stats.last_order_date
                          ? format(new Date(selectedCustomer.stats.last_order_date), 'dd MMM yyyy', { locale: fr })
                          : 'Jamais'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Dernière commande</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;
