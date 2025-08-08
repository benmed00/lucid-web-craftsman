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
import { getProducts } from "@/api/mockApiService";

// Mock data for dashboard
const mockOrders = [
  { id: "ORD-001", customer: "Marie Dubois", total: 89.99, status: "pending", date: "2024-01-15" },
  { id: "ORD-002", customer: "Pierre Martin", total: 156.50, status: "shipped", date: "2024-01-14" },
  { id: "ORD-003", customer: "Sophie Leclerc", total: 234.75, status: "delivered", date: "2024-01-14" },
  { id: "ORD-004", customer: "Antoine Rousseau", total: 67.25, status: "pending", date: "2024-01-13" },
  { id: "ORD-005", customer: "Camille Bernard", total: 198.00, status: "processing", date: "2024-01-13" },
];

const recentActivity = [
  { type: "order", message: "Nouvelle commande #ORD-006 de €125.50", time: "Il y a 5 min" },
  { type: "product", message: "Stock faible: Chapeau Panama (3 restants)", time: "Il y a 15 min" },
  { type: "customer", message: "Nouveau client inscrit: Julie Moreau", time: "Il y a 1h" },
  { type: "order", message: "Commande #ORD-005 expédiée", time: "Il y a 2h" },
  { type: "product", message: "Produit 'Sac Traditionnel' mis à jour", time: "Il y a 3h" },
];

const AdminDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productData = await getProducts();
        setProducts(productData);
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Calculate statistics
  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.new).length,
    totalOrders: mockOrders.length,
    pendingOrders: mockOrders.filter(o => o.status === "pending").length,
    totalRevenue: mockOrders.reduce((sum, order) => sum + order.total, 0),
    avgOrderValue: mockOrders.length > 0 ? mockOrders.reduce((sum, order) => sum + order.total, 0) / mockOrders.length : 0,
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
              {stats.activeProducts} actifs
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
                {mockOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-100">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium text-stone-800">{order.id}</p>
                          <p className="text-sm text-stone-500">{order.customer}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                      <p className="font-semibold text-stone-800">€{order.total}</p>
                    </div>
                  </div>
                ))}
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
                <h4 className="font-medium text-stone-800">Nouveaux clients</h4>
              </div>
              <p className="text-sm text-stone-600">
                23 nouveaux clients ont rejoint la boutique cette semaine.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;