import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnalyticsData {
  overview: {
    revenue: { current: number; previous: number; growth: number };
    orders: { current: number; previous: number; growth: number };
    customers: { current: number; previous: number; growth: number };
    avgOrder: { current: number; previous: number; growth: number };
  };
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesByCategory: Array<{
    category: string;
    sales: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    time: string;
    amount?: number;
  }>;
}

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState("30d");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date ranges
      const endDate = new Date();
      const startDate = new Date();
      const previousStartDate = new Date();
      const previousEndDate = new Date();
      
      switch (timeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7);
          previousStartDate.setDate(endDate.getDate() - 14);
          previousEndDate.setDate(endDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(endDate.getDate() - 30);
          previousStartDate.setDate(endDate.getDate() - 60);
          previousEndDate.setDate(endDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(endDate.getDate() - 90);
          previousStartDate.setDate(endDate.getDate() - 180);
          previousEndDate.setDate(endDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(endDate.getFullYear() - 1);
          previousStartDate.setFullYear(endDate.getFullYear() - 2);
          previousEndDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch current period data
      const { data: currentOrders, error: currentError } = await supabase
        .from('orders')
        .select(`
          id, amount, status, created_at, user_id,
          order_items(id, product_id, quantity, unit_price, total_price, product_snapshot)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (currentError) throw currentError;

      // Fetch previous period data
      const { data: previousOrders, error: previousError } = await supabase
        .from('orders')
        .select('id, amount, status, created_at, user_id')
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString());

      if (previousError) throw previousError;

      // Calculate metrics
      const paidStatuses = ['paid', 'processing', 'shipped', 'delivered'];
      
      const currentRevenue = (currentOrders || [])
        .filter(order => paidStatuses.includes(order.status))
        .reduce((sum, order) => sum + (order.amount || 0), 0) / 100;
      
      const previousRevenue = (previousOrders || [])
        .filter(order => paidStatuses.includes(order.status))
        .reduce((sum, order) => sum + (order.amount || 0), 0) / 100;

      const currentOrderCount = (currentOrders || []).filter(order => paidStatuses.includes(order.status)).length;
      const previousOrderCount = (previousOrders || []).filter(order => paidStatuses.includes(order.status)).length;

      const uniqueCurrentCustomers = new Set((currentOrders || []).filter(order => order.user_id).map(order => order.user_id)).size;
      const uniquePreviousCustomers = new Set((previousOrders || []).filter(order => order.user_id).map(order => order.user_id)).size;

      const currentAvgOrder = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
      const previousAvgOrder = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

      // Calculate growth rates
      const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const ordersGrowth = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0;
      const customersGrowth = uniquePreviousCustomers > 0 ? ((uniqueCurrentCustomers - uniquePreviousCustomers) / uniquePreviousCustomers) * 100 : 0;
      const avgOrderGrowth = previousAvgOrder > 0 ? ((currentAvgOrder - previousAvgOrder) / previousAvgOrder) * 100 : 0;

      // Process top products
      const productSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      
      (currentOrders || []).forEach(order => {
        if (paidStatuses.includes(order.status) && order.order_items) {
          order.order_items.forEach((item: any) => {
            const productName = item.product_snapshot?.name || `Produit ${item.product_id}`;
            if (!productSales[productName]) {
              productSales[productName] = { name: productName, sales: 0, revenue: 0 };
            }
            productSales[productName].sales += item.quantity;
            productSales[productName].revenue += item.total_price;
          });
        }
      });

      const topProducts = Object.keys(productSales)
        .map((key, index) => ({ id: index + 1, ...productSales[key] }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4);

      // Process category sales
      const categorySales: Record<string, number> = {};
      let totalSales = 0;

      (currentOrders || []).forEach(order => {
        if (paidStatuses.includes(order.status) && order.order_items) {
          order.order_items.forEach((item: any) => {
            const category = item.product_snapshot?.category || 'Autre';
            categorySales[category] = (categorySales[category] || 0) + item.quantity;
            totalSales += item.quantity;
          });
        }
      });

      const salesByCategory = Object.keys(categorySales).map(category => ({
        category,
        sales: categorySales[category],
        percentage: totalSales > 0 ? Math.round((categorySales[category] / totalSales) * 100) : 0
      }));

      // Generate recent activity
      const recentActivity = (currentOrders || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
        .map((order, index) => {
          const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60));
          return {
            type: "order",
            description: `Nouvelle commande #${order.id.slice(-8)}`,
            time: `Il y a ${hoursAgo}h`,
            amount: (order.amount || 0) / 100
          };
        });

      setAnalytics({
        overview: {
          revenue: { current: currentRevenue, previous: previousRevenue, growth: revenueGrowth },
          orders: { current: currentOrderCount, previous: previousOrderCount, growth: ordersGrowth },
          customers: { current: uniqueCurrentCustomers, previous: uniquePreviousCustomers, growth: customersGrowth },
          avgOrder: { current: currentAvgOrder, previous: previousAvgOrder, growth: avgOrderGrowth }
        },
        topProducts,
        salesByCategory,
        recentActivity
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analyses');
    } finally {
      setLoading(false);
    }
  };

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
    console.log("Exporting analytics report...");
    toast.success("Fonctionnalité d'export bientôt disponible");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-stone-600">Aucune donnée disponible</p>
      </div>
    );
  }

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
            <div className="text-2xl font-bold">{analytics.overview.revenue.current.toFixed(2)}€</div>
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
            <div className="text-2xl font-bold">{analytics.overview.avgOrder.current.toFixed(2)}€</div>
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
                     <p className="font-semibold text-olive-700">{product.revenue.toFixed(2)}€</p>
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
                     <p className="font-semibold text-olive-700">{activity.amount.toFixed(2)}€</p>
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
            {analytics.overview.revenue.growth > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <h4 className="font-semibold text-green-800">Forte croissance</h4>
                </div>
                <p className="text-sm text-green-700">
                  Vos ventes ont augmenté de {analytics.overview.revenue.growth.toFixed(1)}% sur la période. Excellent travail !
                </p>
              </div>
            )}

            {analytics.salesByCategory.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <h4 className="font-semibold text-blue-800">Catégorie populaire</h4>
                </div>
                <p className="text-sm text-blue-700">
                  {analytics.salesByCategory[0]?.category} représente {analytics.salesByCategory[0]?.percentage}% des ventes.
                </p>
              </div>
            )}

            {analytics.overview.avgOrder.growth < 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <h4 className="font-semibold text-yellow-800">Attention</h4>
                </div>
                <p className="text-sm text-yellow-700">
                  Le panier moyen a diminué de {Math.abs(analytics.overview.avgOrder.growth).toFixed(1)}%. Pensez à proposer des produits complémentaires.
                </p>
              </div>
            )}

            {analytics.overview.customers.growth > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <h4 className="font-semibold text-purple-800">Fidélisation</h4>
                </div>
                <p className="text-sm text-purple-700">
                  {analytics.overview.customers.growth.toFixed(1)}% de nouveaux clients. Excellent taux d'acquisition !
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;