import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Award, Euro, Users, Calendar } from 'lucide-react';
import {
  format,
  subDays,
  eachDayOfInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCurrency } from '@/stores/currencyStore';

interface DiscountCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  usage_count: number;
  is_active: boolean;
  includes_free_shipping: boolean;
  created_at: string;
  valid_from: string | null;
  valid_until: string | null;
}

interface PromoCodeStatsProps {
  coupons: DiscountCoupon[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PromoCodeStats = ({ coupons }: PromoCodeStatsProps) => {
  const { formatPrice } = useCurrency();

  // Calculate total estimated savings
  const totalSavings = useMemo(() => {
    return coupons.reduce((sum, coupon) => {
      // Estimate average order value at 75€ for calculation
      const avgOrderValue = 75;
      const usageCount = coupon.usage_count || 0;

      if (coupon.type === 'percentage') {
        return sum + avgOrderValue * (coupon.value / 100) * usageCount;
      }
      return sum + coupon.value * usageCount;
    }, 0);
  }, [coupons]);

  // Top 5 most used codes
  const topCodes = useMemo(() => {
    return [...coupons]
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 5)
      .map((coupon) => ({
        code: coupon.code,
        usage: coupon.usage_count || 0,
        value:
          coupon.type === 'percentage'
            ? `${coupon.value}%`
            : `${coupon.value}€`,
        type: coupon.type,
      }));
  }, [coupons]);

  // Usage distribution by type
  const usageByType = useMemo(() => {
    const percentageCoupons = coupons.filter((c) => c.type === 'percentage');
    const fixedCoupons = coupons.filter((c) => c.type === 'fixed');

    const percentageUsage = percentageCoupons.reduce(
      (sum, c) => sum + (c.usage_count || 0),
      0
    );
    const fixedUsage = fixedCoupons.reduce(
      (sum, c) => sum + (c.usage_count || 0),
      0
    );

    return [
      {
        name: 'Pourcentage',
        value: percentageUsage,
        count: percentageCoupons.length,
      },
      { name: 'Montant fixe', value: fixedUsage, count: fixedCoupons.length },
    ].filter((item) => item.value > 0 || item.count > 0);
  }, [coupons]);

  // Coupon creation trend (last 30 days)
  const creationTrend = useMemo(() => {
    const last30Days = eachDayOfInterval({
      start: subDays(new Date(), 29),
      end: new Date(),
    });

    return last30Days.map((day) => {
      const dayStart = startOfDay(day);
      const count = coupons.filter((coupon) => {
        const createdAt = startOfDay(parseISO(coupon.created_at));
        return createdAt.getTime() === dayStart.getTime();
      }).length;

      return {
        date: format(day, 'dd/MM', { locale: fr }),
        fullDate: format(day, 'dd MMM', { locale: fr }),
        count,
      };
    });
  }, [coupons]);

  // Calculate some additional stats
  const freeShippingCount = coupons.filter(
    (c) => c.includes_free_shipping
  ).length;
  const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
  const avgUsagePerCode =
    coupons.length > 0 ? (totalUsage / coupons.length).toFixed(1) : '0';

  // Status distribution
  const statusDistribution = useMemo(() => {
    const now = new Date();
    const active = coupons.filter((c) => {
      if (!c.is_active) return false;
      if (c.valid_until && new Date(c.valid_until) < now) return false;
      if (c.valid_from && new Date(c.valid_from) > now) return false;
      return true;
    }).length;

    const inactive = coupons.filter((c) => !c.is_active).length;
    const expired = coupons.filter(
      (c) => c.is_active && c.valid_until && new Date(c.valid_until) < now
    ).length;
    const scheduled = coupons.filter(
      (c) => c.is_active && c.valid_from && new Date(c.valid_from) > now
    ).length;

    return [
      { name: 'Actifs', value: active, color: 'hsl(var(--primary))' },
      {
        name: 'Inactifs',
        value: inactive,
        color: 'hsl(var(--muted-foreground))',
      },
      { name: 'Expirés', value: expired, color: 'hsl(var(--destructive))' },
      { name: 'Planifiés', value: scheduled, color: 'hsl(var(--chart-4))' },
    ].filter((item) => item.value > 0);
  }, [coupons]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Économies générées
            </CardTitle>
            <Euro className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ~{formatPrice(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimation basée sur panier moyen {formatPrice(75)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Moyenne par code
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUsagePerCode}</div>
            <p className="text-xs text-muted-foreground">
              utilisations par code
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Livraison offerte
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeShippingCount}</div>
            <p className="text-xs text-muted-foreground">
              codes avec livraison gratuite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Codes créés (30j)
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                coupons.filter((c) => {
                  const created = new Date(c.created_at);
                  return created >= subDays(new Date(), 30);
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">nouveaux codes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Codes Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-primary" />
              Codes les plus populaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCodes.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topCodes}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis type="number" className="text-xs" />
                    <YAxis
                      dataKey="code"
                      type="category"
                      width={80}
                      className="text-xs"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <p className="font-mono font-bold">{data.code}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.usage} utilisations
                              </p>
                              <p className="text-sm text-primary">
                                Réduction: {data.value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="usage"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <div className="h-[250px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.value} codes
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {statusDistribution.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage by Type & Creation Trend */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Usage by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilisation par type</CardTitle>
          </CardHeader>
          <CardContent>
            {usageByType.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={usageByType} margin={{ top: 10 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {data.value} utilisations
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ({data.count} codes)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {usageByType.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creation Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Création de codes (30 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={creationTrend} margin={{ top: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <p className="font-medium">{data.fullDate}</p>
                            <p className="text-sm text-primary">
                              {data.count} code{data.count > 1 ? 's' : ''} créé
                              {data.count > 1 ? 's' : ''}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromoCodeStats;
