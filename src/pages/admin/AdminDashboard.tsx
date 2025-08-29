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
            message: `Nouvelle commande #${order.id.slice(-8)} de €${(order.amount / 100).toFixed(2)}`,
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
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "processing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "shipped": return "bg-purple-100 text-purple-800 border-purple-200";
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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
        <div className="text-stone-600">Chargement du tableau de bord...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-serif font-bold text-stone-800">
          Tableau de bord
        </h1>
        <p className="text-stone-600">
          Bienvenue dans votre espace d'administration. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Produits Total
            </CardTitle>
            <Package className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-800">{stats.totalProducts}</div>
              <p className="text-xs text-stone-500">
                {stats.activeProducts} actifs • {stats.lowStockProducts} stock faible
              </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Commandes Total
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-800">{stats.totalOrders}</div>
            <p className="text-xs text-stone-500">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Chiffre d'affaires
            </CardTitle>
            <DollarSign className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-800">
              €{stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +12% ce mois
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-stone-600">
              Panier Moyen
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-800">
              €{stats.avgOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-stone-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +5% ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card className="border-stone-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-stone-800">
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
                  <div className="text-center py-8 text-stone-500">
                    Aucune commande trouvée
                  </div>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-100">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-stone-800">#{order.id.slice(-8)}</p>
                            <p className="text-sm text-stone-500">
                              {order.profiles?.full_name || 'Client anonyme'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusText(order.status)}
                        </Badge>
                        <p className="font-semibold text-stone-800">
                          €{(order.amount / 100).toFixed(2)}
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
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-stone-800">
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 p-2 rounded-full bg-olive-100">
                        <Icon className="h-3 w-3 text-olive-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-800">{activity.message}</p>
                        <p className="text-xs text-stone-500">{activity.time}</p>
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
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-800">
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
                  <div className="text-sm text-stone-500">Créer un nouveau produit</div>
                </div>
              </Button>
            </Link>
            
            <Link to="/admin/orders">
              <Button className="w-full justify-start h-auto p-4" variant="outline">
                <ShoppingCart className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Voir les commandes</div>
                  <div className="text-sm text-stone-500">Gérer les commandes clients</div>
                </div>
              </Button>
            </Link>

            <Link to="/admin/settings">
              <Button className="w-full justify-start h-auto p-4" variant="outline">
                <Settings className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Paramètres</div>
                  <div className="text-sm text-stone-500">Configurer la boutique</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <SecurityStatusCard />

      {/* Business Insights */}
      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-stone-800">
            Aperçus Business
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-stone-800">Croissance des ventes</h4>
              </div>
              <p className="text-sm text-stone-600">
                Les ventes ont augmenté de 15% ce mois par rapport au mois dernier.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-stone-800">Produits populaires</h4>
              </div>
              <p className="text-sm text-stone-600">
                Les chapeaux représentent 45% des ventes totales ce mois.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600" />
                <h4 className="font-medium text-stone-800">Total clients</h4>
              </div>
              <p className="text-sm text-stone-600">
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