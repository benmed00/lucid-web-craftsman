import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Search, 
  Eye, 
  RefreshCw, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  ShoppingBag,
  Star,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface CustomerStats {
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  avg_order_value: number;
}

interface Customer extends CustomerProfile {
  stats: CustomerStats;
  status: 'active' | 'inactive' | 'premium';
}

const AdminCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch customers with their order statistics
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Get all customer profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get order statistics for each customer
      const customersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get customer's orders
          const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('amount, created_at, status')
            .eq('user_id', profile.id);

          if (ordersError) {
            console.error('Error fetching orders for customer:', ordersError);
          }

          // Calculate statistics
          const validOrders = orders?.filter(order => 
            ['paid', 'processing', 'shipped', 'delivered'].includes(order.status)
          ) || [];

          const totalOrders = validOrders.length;
          const totalSpent = validOrders.reduce((sum, order) => sum + (order.amount / 100), 0);
          const lastOrderDate = validOrders.length > 0 
            ? validOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
            : null;
          const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

          // Determine customer status
          let status: 'active' | 'inactive' | 'premium' = 'inactive';
          if (totalSpent > 500) {
            status = 'premium';
          } else if (totalOrders > 0) {
            status = 'active';
          }

          return {
            ...profile,
            stats: {
              total_orders: totalOrders,
              total_spent: totalSpent,
              last_order_date: lastOrderDate,
              avg_order_value: avgOrderValue
            },
            status
          } as Customer;
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      (customer.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (customer.city?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const premiumCustomers = customers.filter(c => c.status === 'premium').length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.stats.total_spent, 0);

  const getStatusBadge = (status: 'active' | 'inactive' | 'premium') => {
    switch (status) {
      case 'premium':
        return <Badge className="bg-amber-500 text-white">Premium</Badge>;
      case 'active':
        return <Badge className="bg-green-500 text-white">Actif</Badge>;
      case 'inactive':
        return <Badge variant="outline">Inactif</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Gestion des Clients</h1>
          <p className="text-stone-600">Gérez tous vos clients et leurs commandes</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Total clients</p>
                <p className="text-2xl font-bold text-olive-600">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-olive-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Clients actifs</p>
                <p className="text-2xl font-bold text-green-600">{activeCustomers}</p>
              </div>
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">Clients premium</p>
                <p className="text-2xl font-bold text-amber-600">{premiumCustomers}</p>
              </div>
              <Star className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600">CA total</p>
                <p className="text-2xl font-bold text-blue-600">{totalRevenue.toFixed(2)} €</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Rechercher par nom, téléphone ou ville..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
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
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left p-4 font-medium text-stone-700">Client</th>
                  <th className="text-left p-4 font-medium text-stone-700">Contact</th>
                  <th className="text-left p-4 font-medium text-stone-700">Inscription</th>
                  <th className="text-left p-4 font-medium text-stone-700">Commandes</th>
                  <th className="text-left p-4 font-medium text-stone-700">Dernière commande</th>
                  <th className="text-left p-4 font-medium text-stone-700">Statut</th>
                  <th className="text-left p-4 font-medium text-stone-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-stone-200 hover:bg-stone-50">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                          <span className="text-olive-700 font-medium">
                            {(customer.full_name || 'Client')
                              .split(' ')
                              .map(n => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-stone-800">
                            {customer.full_name || 'Client anonyme'}
                          </p>
                          <p className="text-sm text-stone-600">#{customer.id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-stone-600">{customer.phone || 'N/A'}</p>
                        <p className="text-sm text-stone-600">
                          {customer.city ? `${customer.city}, ${customer.country || 'France'}` : 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">
                        {format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{customer.stats.total_orders}</p>
                        <p className="text-sm text-stone-600">
                          {customer.stats.total_spent.toFixed(2)} €
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">
                        {customer.stats.last_order_date 
                          ? format(new Date(customer.stats.last_order_date), 'dd/MM/yyyy', { locale: fr })
                          : 'Jamais'
                        }
                      </p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="p-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {customer.full_name || 'Client anonyme'}
                            </DialogTitle>
                            <DialogDescription>
                              Client depuis le {format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: fr })}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedCustomer && (
                            <div className="space-y-6">
                              {/* Customer Info */}
                              <div>
                                <h4 className="font-medium mb-3">Informations personnelles</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-stone-600">Nom complet:</span>
                                    <p className="font-medium">{selectedCustomer.full_name || 'Non renseigné'}</p>
                                  </div>
                                  <div>
                                    <span className="text-stone-600">Téléphone:</span>
                                    <p className="font-medium">{selectedCustomer.phone || 'Non renseigné'}</p>
                                  </div>
                                  <div>
                                    <span className="text-stone-600">Ville:</span>
                                    <p className="font-medium">{selectedCustomer.city || 'Non renseigné'}</p>
                                  </div>
                                  <div>
                                    <span className="text-stone-600">Code postal:</span>
                                    <p className="font-medium">{selectedCustomer.postal_code || 'Non renseigné'}</p>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Order Statistics */}
                              <div>
                                <h4 className="font-medium mb-3">Statistiques de commandes</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-stone-50 rounded-lg">
                                    <p className="text-2xl font-bold text-olive-600">
                                      {selectedCustomer.stats.total_orders}
                                    </p>
                                    <p className="text-xs text-stone-600">Commandes total</p>
                                  </div>
                                  <div className="text-center p-3 bg-stone-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">
                                      {selectedCustomer.stats.total_spent.toFixed(2)} €
                                    </p>
                                    <p className="text-xs text-stone-600">Dépenses total</p>
                                  </div>
                                  <div className="text-center p-3 bg-stone-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">
                                      {selectedCustomer.stats.avg_order_value.toFixed(2)} €
                                    </p>
                                    <p className="text-xs text-stone-600">Panier moyen</p>
                                  </div>
                                </div>
                              </div>

                              {selectedCustomer.bio && (
                                <>
                                  <Separator />
                                  <div>
                                    <h4 className="font-medium mb-3">Bio</h4>
                                    <p className="text-sm text-stone-600">{selectedCustomer.bio}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && !loading && (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-800 mb-2">
                Aucun client trouvé
              </h3>
              <p className="text-stone-600">
                {searchQuery || filterStatus !== "all" 
                  ? "Aucun client ne correspond à vos critères de recherche."
                  : "Vous n'avez pas encore de clients enregistrés."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomers;