import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Download
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Mock analytics data - replace with real Supabase data
const mockAnalytics = {
  overview: {
    revenue: {
      current: 2845,
      previous: 2156,
      growth: 31.9
    },
    orders: {
      current: 18,
      previous: 12,
      growth: 50
    },
    customers: {
      current: 24,
      previous: 18,
      growth: 33.3
    },
    avgOrder: {
      current: 158,
      previous: 179,
      growth: -11.7
    }
  },
  topProducts: [
    { id: 1, name: "Sac à Main Tissé Traditionnel", sales: 8, revenue: 712 },
    { id: 2, name: "Chapeau de Paille Berbère", sales: 6, revenue: 270 },
    { id: 3, name: "Cabas en Fibres Naturelles", sales: 4, revenue: 300 },
    { id: 4, name: "Pochette Brodée à la Main", sales: 3, revenue: 186 }
  ],
  salesByCategory: [
    { category: "Sacs", sales: 15, percentage: 75 },
    { category: "Chapeaux", sales: 5, percentage: 25 }
  ],
  recentActivity: [
    { type: "order", description: "Nouvelle commande de Marie Dubois", time: "Il y a 2h", amount: 145 },
    { type: "customer", description: "Nouveau client: Pierre Moreau", time: "Il y a 4h" },
    { type: "product", description: "Stock faible: Chapeau Panama", time: "Il y a 6h" },
    { type: "order", description: "Commande expédiée à Jean Martin", time: "Il y a 8h", amount: 89 }
  ]
};

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [analytics, setAnalytics] = useState(mockAnalytics);

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingCart className="h-4 w-4 text-blue-600" />;
      case "customer": return <Users className="h-4 w-4 text-green-600" />;
      case "product": return <Package className="h-4 w-4 text-orange-600" />;
      default: return <BarChart3 className="h-4 w-4 text-stone-600" />;
    }
  };

  const exportReport = () => {
    // Export logic here
    console.log("Exporting analytics report...");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-stone-800">
            Analyses et statistiques
          </h2>
          <p className="text-stone-600">
            Aperçu des performances de votre boutique
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="30d">30 jours</SelectItem>
              <SelectItem value="90d">3 mois</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-olive-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.revenue.current}€</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analytics.overview.revenue.growth)}`}>
              {getGrowthIcon(analytics.overview.revenue.growth)}
              <span className="ml-1">
                {analytics.overview.revenue.growth > 0 ? "+" : ""}{analytics.overview.revenue.growth.toFixed(1)}%
              </span>
              <span className="text-stone-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.orders.current}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analytics.overview.orders.growth)}`}>
              {getGrowthIcon(analytics.overview.orders.growth)}
              <span className="ml-1">
                {analytics.overview.orders.growth > 0 ? "+" : ""}{analytics.overview.orders.growth.toFixed(1)}%
              </span>
              <span className="text-stone-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux clients</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.customers.current}</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analytics.overview.customers.growth)}`}>
              {getGrowthIcon(analytics.overview.customers.growth)}
              <span className="ml-1">
                {analytics.overview.customers.growth > 0 ? "+" : ""}{analytics.overview.customers.growth.toFixed(1)}%
              </span>
              <span className="text-stone-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.avgOrder.current}€</div>
            <div className={`flex items-center text-xs ${getGrowthColor(analytics.overview.avgOrder.growth)}`}>
              {getGrowthIcon(analytics.overview.avgOrder.growth)}
              <span className="ml-1">
                {analytics.overview.avgOrder.growth > 0 ? "+" : ""}{analytics.overview.avgOrder.growth.toFixed(1)}%
              </span>
              <span className="text-stone-600 ml-1">vs période précédente</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-olive-600" />
              Produits les plus vendus
            </CardTitle>
            <CardDescription>
              Performance des produits sur la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 border border-stone-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-olive-100 rounded-full">
                      <span className="text-olive-700 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-800 line-clamp-1">{product.name}</p>
                      <p className="text-sm text-stone-600">{product.sales} ventes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-olive-700">{product.revenue}€</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-blue-600" />
              Ventes par catégorie
            </CardTitle>
            <CardDescription>
              Répartition des ventes par type de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.salesByCategory.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-sm font-semibold">{category.sales} ventes ({category.percentage}%)</span>
                  </div>
                  <Progress value={category.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-purple-600" />
            Activité récente
          </CardTitle>
          <CardDescription>
            Dernières actions sur votre boutique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border border-stone-200 rounded-lg">
                <div className="p-2 bg-stone-100 rounded-lg">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-stone-800">{activity.description}</p>
                  <p className="text-sm text-stone-600">{activity.time}</p>
                </div>
                {activity.amount && (
                  <div className="text-right">
                    <p className="font-semibold text-olive-700">{activity.amount}€</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Insights et recommandations
          </CardTitle>
          <CardDescription>
            Conseils pour améliorer vos performances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold text-green-800">Forte croissance</h4>
              </div>
              <p className="text-sm text-green-700">
                Vos ventes ont augmenté de 31% ce mois-ci. Excellent travail !
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h4 className="font-semibold text-blue-800">Opportunité</h4>
              </div>
              <p className="text-sm text-blue-700">
                Considérez ajouter plus de variété dans la catégorie "Chapeaux".
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <h4 className="font-semibold text-yellow-800">Attention</h4>
              </div>
              <p className="text-sm text-yellow-700">
                Le panier moyen a diminué. Pensez à proposer des produits complémentaires.
              </p>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <h4 className="font-semibold text-purple-800">Fidélisation</h4>
              </div>
              <p className="text-sm text-purple-700">
                33% de nouveaux clients ce mois. Excellent taux d'acquisition !
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;