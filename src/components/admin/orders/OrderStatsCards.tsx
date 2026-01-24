import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderStats } from '@/hooks/useOrderManagement';
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

export function OrderStatsCards() {
  const { data: stats, isLoading } = useOrderStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total',
      value: stats.total,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'En attente',
      value: stats.pending_payment,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'En traitement',
      value: stats.processing,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Expédiées',
      value: stats.shipped,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Livrées',
      value: stats.delivered,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Anomalies',
      value: stats.anomalies,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      highlight: stats.anomalies > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.label} 
            className={stat.highlight ? 'ring-2 ring-orange-300' : ''}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Attention required banner
export function AttentionBanner() {
  const { data: stats } = useOrderStats();

  if (!stats?.requires_attention) return null;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3 dark:bg-orange-950/30 dark:border-orange-900">
      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
      <div>
        <p className="font-medium text-orange-800 dark:text-orange-200">
          {stats.requires_attention} commande(s) nécessite(nt) votre attention
        </p>
        <p className="text-sm text-orange-600 dark:text-orange-400">
          Des anomalies critiques ou des problèmes de livraison ont été détectés
        </p>
      </div>
    </div>
  );
}
