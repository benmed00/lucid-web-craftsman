import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecurityStatusCard } from "@/components/admin/SecurityStatusCard";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  AlertTriangle,
  Plus,
  Eye,
  Settings,
  BarChart3
} from "lucide-react";
import { Product } from "@/shared/interfaces/Iproduct.interface";
import { ProductService } from "@/services/productService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/stores/currencyStore";

interface Order {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  currency: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalCustomers: number;
  lowStockProducts: number;
}

const AdminDashboard = () => {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load products
        const productData = await ProductService.getAllProducts();
        setProducts(productData);

        // Load orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            amount,
            status,
            currency,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ordersError) throw ordersError;

        // Load user profiles for orders
        const ordersWithProfiles = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', order.user_id)
              .single();
            
            return {
              ...order,
              profiles: profile
            };
          })
        );

        setOrders(ordersWithProfiles);

        // Load customer count
        const { count: customerCount, error: customerError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (customerError) throw customerError;

        // Calculate statistics
        const totalProducts = productData.length;
        const activeProducts = productData.filter(p => p.is_active !== false).length;
        const lowStockProducts = productData.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 5)).length;
        const totalOrders = ordersData?.length || 0;
        const pendingOrders = ordersData?.filter(o => o.status === 'pending').length || 0;
        const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.amount / 100), 0) || 0;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        setStats({
          totalProducts,
          activeProducts,
          totalOrders,
          pendingOrders,
          totalRevenue,
          avgOrderValue,
          totalCustomers: customerCount || 0,
          lowStockProducts,
        });

        // Generate recent activity from real data
        const activities = [];
        
        // Recent orders
        ordersData?.slice(0, 3).forEach(order => {
          activities.push({
            type: "order",
            message: `Nouvelle commande #${order.id.slice(-8)} de ${formatPrice(order.amount / 100)}`,
            time: formatTimeAgo(order.created_at)
          });
        });

        // Low stock products
        productData.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 5)).slice(0, 2).forEach(product => {
          const stock = product.stock_quantity || 0;
          activities.push({
            type: "product",
            message: `Stock faible: ${product.name} (${stock} restant${stock > 1 ? 's' : ''})`,
            time: "Il y a 1h"
          });
        });

        setRecentActivity(activities.slice(0, 5));

      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        toast.error("Erreur lors du chargement des données du tableau de bord");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Il y a moins d'1h";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "pending": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "processing": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "shipped": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "delivered": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "pending": return "En attente";
      case "processing": return "En cours";
      case "shipped": return "Expédiée";
      case "delivered": return "Livrée";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order": return ShoppingCart;
      case "product": return Package;
      case "customer": return Users;
      default: return AlertTriangle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-serif font-bold text-foreground">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground">
          Bienvenue dans votre espace d'administration. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produits Total
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} actifs • {stats.lowStockProducts} stock faible
              </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Commandes Total
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chiffre d'affaires
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPrice(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
              +12% ce mois
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Panier Moyen
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPrice(stats.avgOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" />
              +5% ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground">
                Commandes Récentes
              </CardTitle>
              <Link to="/admin/orders">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir tout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune commande trouvée
                  </div>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-foreground">#{order.id.slice(-8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.profiles?.full_name || 'Client anonyme'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        <p className="font-semibold text-foreground">
                          {formatPrice(order.amount / 100)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                        <Icon className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/products">
              <Button className="w-full justify-start h-auto p-4" variant="outline">
                <Plus className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Ajouter un produit</div>
                  <div className="text-sm text-muted-foreground">Créer un nouveau produit</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/admin/orders">
              <Button className="w-full justify-start h-auto p-4" variant="outline">
                <ShoppingCart className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Voir les commandes</div>
                  <div className="text-sm text-muted-foreground">Gérer les commandes clients</div>
                </div>
              </Button>
            </Link>

            <Link to="/admin/settings">
              <Button className="w-full justify-start h-auto p-4" variant="outline">
                <Settings className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Paramètres</div>
                  <div className="text-sm text-muted-foreground">Configurer la boutique</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <SecurityStatusCard />

      {/* Business Insights */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">
            Aperçus Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h4 className="font-medium text-foreground">Croissance des ventes</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Les ventes ont augmenté de 15% ce mois par rapport au mois dernier.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-medium text-foreground">Produits populaires</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Les chapeaux représentent 45% des ventes totales ce mois.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-foreground">Total clients</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.totalCustomers} client{stats.totalCustomers > 1 ? 's' : ''} inscrit{stats.totalCustomers > 1 ? 's' : ''} dans la boutique.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;