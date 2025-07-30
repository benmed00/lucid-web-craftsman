import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ShoppingCart, 
  Euro, 
  TrendingUp,
  Users,
  AlertCircle,
  Eye,
  Plus,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { getProducts } from "@/api/mockApiService";
import { Product } from "@/shared/interfaces/Iproduct.interface";

// Mock orders data - replace with real data from Supabase
const mockOrders = [
  {
    id: 1,
    customerName: "Marie Dubois",
    email: "marie.dubois@email.com",
    total: 145,
    status: "pending",
    date: "2024-01-15",
    items: 2
  },
  {
    id: 2,
    customerName: "Jean Martin",
    email: "jean.martin@email.com",
    total: 89,
    status: "shipped",
    date: "2024-01-14",
    items: 1
  },
  {
    id: 3,
    customerName: "Sophie Laurent",
    email: "sophie.laurent@email.com",
    total: 267,
    status: "completed",
    date: "2024-01-13",
    items: 3
  }
];

const AdminDashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => !p.new).length,
    totalOrders: mockOrders.length,
    pendingOrders: mockOrders.filter(o => o.status === "pending").length,
    totalRevenue: mockOrders.reduce((sum, order) => sum + order.total, 0),
    avgOrderValue: mockOrders.length > 0 
      ? Math.round(mockOrders.reduce((sum, order) => sum + order.total, 0) / mockOrders.length)
      : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-stone-100 text-stone-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "En attente";
      case "shipped": return "Expédiée";
      case "completed": return "Terminée";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-olive-50 to-beige-50 p-6 rounded-lg border border-olive-200">
        <h2 className="text-2xl font-serif font-semibold text-stone-800 mb-2">
          Bienvenue dans votre espace administrateur
        </h2>
        <p className="text-stone-600">
          Gérez vos produits, commandes et paramètres en toute simplicité
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produits</CardTitle>
            <Package className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-stone-600">
              {stats.activeProducts} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-stone-600">
              {stats.pendingOrders} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue}€</div>
            <p className="text-xs text-stone-600">
              Total des ventes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOrderValue}€</div>
            <p className="text-xs text-stone-600">
              Par commande
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Commandes récentes
              <Link to="/admin/orders">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir tout
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              Dernières commandes reçues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-stone-800">{order.customerName}</p>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-600">{order.email}</p>
                    <p className="text-xs text-stone-500">
                      {order.items} articles • {order.total}€
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Gestion des produits
              <Link to="/admin/products">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </Link>
            </CardTitle>
            <CardDescription>
              État de votre catalogue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-olive-600" />
                  <div>
                    <p className="font-medium">Produits actifs</p>
                    <p className="text-sm text-stone-600">Visibles sur le site</p>
                  </div>
                </div>
                <Badge variant="outline">{stats.activeProducts}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Nouveaux produits</p>
                    <p className="text-sm text-stone-600">Marqués comme "Nouveau"</p>
                  </div>
                </div>
                <Badge variant="outline">{products.filter(p => p.new).length}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Artisans partenaires</p>
                    <p className="text-sm text-stone-600">Créateurs référencés</p>
                  </div>
                </div>
                <Badge variant="outline">
                  {[...new Set(products.map(p => p.artisan))].length}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Raccourcis vers les fonctions les plus utilisées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/admin/products/new">
              <Button className="w-full h-20 bg-olive-700 hover:bg-olive-800">
                <div className="text-center">
                  <Plus className="h-6 w-6 mb-2 mx-auto" />
                  <span>Ajouter un produit</span>
                </div>
              </Button>
            </Link>

            <Link to="/admin/orders">
              <Button variant="outline" className="w-full h-20">
                <div className="text-center">
                  <ShoppingCart className="h-6 w-6 mb-2 mx-auto" />
                  <span>Voir les commandes</span>
                </div>
              </Button>
            </Link>

            <Link to="/admin/settings">
              <Button variant="outline" className="w-full h-20">
                <div className="text-center">
                  <Settings className="h-6 w-6 mb-2 mx-auto" />
                  <span>Paramètres</span>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;