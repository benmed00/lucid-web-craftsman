import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Globe,
  Database,
  CreditCard,
  Mail,
  Clock,
  Activity,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceStatus {
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  responseTime?: number;
  lastChecked?: Date;
  icon: React.ComponentType<{ className?: string }>;
  category: 'core' | 'external' | 'edge';
}

interface IncidentHistory {
  id: string;
  service: string;
  status: 'resolved' | 'investigating' | 'identified';
  message: string;
  timestamp: Date;
}

const AdminApiStatus = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Supabase Database',
      description: 'Base de données principale',
      status: 'checking',
      icon: Database,
      category: 'core',
    },
    {
      name: 'Supabase Auth',
      description: 'Authentification utilisateurs',
      status: 'checking',
      icon: Server,
      category: 'core',
    },
    {
      name: 'Supabase Storage',
      description: 'Stockage des fichiers',
      status: 'checking',
      icon: Globe,
      category: 'core',
    },
    {
      name: 'Stripe API',
      description: 'Paiements en ligne',
      status: 'checking',
      icon: CreditCard,
      category: 'external',
    },
    {
      name: 'Resend Email',
      description: "Envoi d'emails transactionnels",
      status: 'checking',
      icon: Mail,
      category: 'external',
    },
    {
      name: 'Edge Functions',
      description: 'Fonctions serverless',
      status: 'checking',
      icon: Activity,
      category: 'edge',
    },
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);
  const [overallHealth, setOverallHealth] = useState(0);
  const [incidents, setIncidents] = useState<IncidentHistory[]>([]);

  const checkSupabaseDatabase = async (): Promise<ServiceStatus> => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      const responseTime = Math.round(performance.now() - start);

      if (error) throw error;

      return {
        name: 'Supabase Database',
        description: 'Base de données principale',
        status: responseTime > 2000 ? 'degraded' : 'operational',
        responseTime,
        lastChecked: new Date(),
        icon: Database,
        category: 'core',
      };
    } catch (error) {
      return {
        name: 'Supabase Database',
        description: 'Base de données principale',
        status: 'down',
        lastChecked: new Date(),
        icon: Database,
        category: 'core',
      };
    }
  };

  const checkSupabaseAuth = async (): Promise<ServiceStatus> => {
    const start = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const responseTime = Math.round(performance.now() - start);

      if (error) throw error;

      return {
        name: 'Supabase Auth',
        description: 'Authentification utilisateurs',
        status: responseTime > 2000 ? 'degraded' : 'operational',
        responseTime,
        lastChecked: new Date(),
        icon: Server,
        category: 'core',
      };
    } catch (error) {
      return {
        name: 'Supabase Auth',
        description: 'Authentification utilisateurs',
        status: 'down',
        lastChecked: new Date(),
        icon: Server,
        category: 'core',
      };
    }
  };

  const checkSupabaseStorage = async (): Promise<ServiceStatus> => {
    const start = performance.now();
    try {
      const { error } = await supabase.storage.listBuckets();
      const responseTime = Math.round(performance.now() - start);

      return {
        name: 'Supabase Storage',
        description: 'Stockage des fichiers',
        status: error
          ? 'degraded'
          : responseTime > 2000
            ? 'degraded'
            : 'operational',
        responseTime,
        lastChecked: new Date(),
        icon: Globe,
        category: 'core',
      };
    } catch (error) {
      return {
        name: 'Supabase Storage',
        description: 'Stockage des fichiers',
        status: 'down',
        lastChecked: new Date(),
        icon: Globe,
        category: 'core',
      };
    }
  };

  const checkStripeAPI = async (): Promise<ServiceStatus> => {
    // We can't directly check Stripe from frontend, but we can check if keys are configured
    const start = performance.now();
    try {
      // Check if Stripe publishable key exists
      const hasStripeKey = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const responseTime = Math.round(performance.now() - start);

      return {
        name: 'Stripe API',
        description: 'Paiements en ligne',
        status: hasStripeKey ? 'operational' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        icon: CreditCard,
        category: 'external',
      };
    } catch (error) {
      return {
        name: 'Stripe API',
        description: 'Paiements en ligne',
        status: 'down',
        lastChecked: new Date(),
        icon: CreditCard,
        category: 'external',
      };
    }
  };

  const checkResendEmail = async (): Promise<ServiceStatus> => {
    // Check if email logs show recent successful sends
    const start = performance.now();
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('status, sent_at')
        .order('sent_at', { ascending: false })
        .limit(5);

      const responseTime = Math.round(performance.now() - start);

      if (error) throw error;

      const hasRecentSuccess = data?.some((log) => log.status === 'sent');
      const hasRecentFailure = data?.some((log) => log.status === 'failed');

      return {
        name: 'Resend Email',
        description: "Envoi d'emails transactionnels",
        status: hasRecentFailure
          ? 'degraded'
          : hasRecentSuccess
            ? 'operational'
            : 'operational',
        responseTime,
        lastChecked: new Date(),
        icon: Mail,
        category: 'external',
      };
    } catch (error) {
      return {
        name: 'Resend Email',
        description: "Envoi d'emails transactionnels",
        status: 'degraded',
        lastChecked: new Date(),
        icon: Mail,
        category: 'external',
      };
    }
  };

  const checkEdgeFunctions = async (): Promise<ServiceStatus> => {
    const start = performance.now();
    try {
      // Test a simple edge function call
      const { data, error } = await supabase.functions.invoke(
        'check-promo-alerts',
        {
          body: { test: true },
        }
      );

      const responseTime = Math.round(performance.now() - start);

      return {
        name: 'Edge Functions',
        description: 'Fonctions serverless',
        status: error
          ? 'degraded'
          : responseTime > 3000
            ? 'degraded'
            : 'operational',
        responseTime,
        lastChecked: new Date(),
        icon: Activity,
        category: 'edge',
      };
    } catch (error) {
      return {
        name: 'Edge Functions',
        description: 'Fonctions serverless',
        status: 'degraded',
        lastChecked: new Date(),
        icon: Activity,
        category: 'edge',
      };
    }
  };

  const runAllChecks = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const results = await Promise.all([
        checkSupabaseDatabase(),
        checkSupabaseAuth(),
        checkSupabaseStorage(),
        checkStripeAPI(),
        checkResendEmail(),
        checkEdgeFunctions(),
      ]);

      setServices(results);
      setLastFullCheck(new Date());

      // Calculate overall health
      const operationalCount = results.filter(
        (s) => s.status === 'operational'
      ).length;
      const degradedCount = results.filter(
        (s) => s.status === 'degraded'
      ).length;
      const health = Math.round(
        (operationalCount * 100 + degradedCount * 50) / results.length
      );
      setOverallHealth(health);

      // Add incidents for non-operational services
      const newIncidents: IncidentHistory[] = results
        .filter((s) => s.status !== 'operational')
        .map((s) => ({
          id: `${s.name}-${Date.now()}`,
          service: s.name,
          status:
            s.status === 'down'
              ? ('investigating' as const)
              : ('identified' as const),
          message:
            s.status === 'down'
              ? `${s.name} est actuellement indisponible`
              : `${s.name} rencontre des performances dégradées`,
          timestamp: new Date(),
        }));

      if (newIncidents.length > 0) {
        setIncidents((prev) => [...newIncidents, ...prev].slice(0, 10));
      }

      toast.success('Vérification des services terminée');
    } catch (error) {
      toast.error('Erreur lors de la vérification des services');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runAllChecks();

    // Auto-refresh every 5 minutes
    const interval = setInterval(runAllChecks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [runAllChecks]);

  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            Opérationnel
          </Badge>
        );
      case 'degraded':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            Dégradé
          </Badge>
        );
      case 'down':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            Indisponible
          </Badge>
        );
      case 'checking':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            Vérification...
          </Badge>
        );
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getHealthColor = () => {
    if (overallHealth >= 90) return 'bg-green-500';
    if (overallHealth >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const coreServices = services.filter((s) => s.category === 'core');
  const externalServices = services.filter((s) => s.category === 'external');
  const edgeServices = services.filter((s) => s.category === 'edge');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Statut des Services
          </h1>
          <p className="text-muted-foreground">
            Surveillance en temps réel de tous les services
          </p>
        </div>
        <Button onClick={runAllChecks} disabled={isRefreshing}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Overall Status */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              {navigator.onLine ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600" />
              )}
              Santé Globale du Système
            </span>
            <span className="text-2xl font-bold">{overallHealth}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={overallHealth}
            className={`h-3 ${getHealthColor()}`}
          />
          {lastFullCheck && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Dernière vérification :{' '}
              {lastFullCheck.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid gap-6">
        {/* Core Services */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Services Principaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coreServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {service.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.responseTime && (
                      <span className="text-sm text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* External Services */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Services Externes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {externalServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {service.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.responseTime && (
                      <span className="text-sm text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Edge Functions */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Edge Functions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {edgeServices.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(service.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {service.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {service.responseTime && (
                      <span className="text-sm text-muted-foreground">
                        {service.responseTime}ms
                      </span>
                    )}
                    {getStatusBadge(service.status)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Incident History */}
      {incidents.length > 0 && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Historique des Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div
                    className={`w-2 h-2 mt-2 rounded-full ${
                      incident.status === 'resolved'
                        ? 'bg-green-500'
                        : incident.status === 'identified'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {incident.service}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {incident.timestamp.toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {incident.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">
            Liens de Surveillance Externes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://status.supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Database className="h-5 w-5 text-primary" />
              <span className="font-medium">Supabase Status</span>
            </a>
            <a
              href="https://status.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Stripe Status</span>
            </a>
            <a
              href="https://resend.com/status"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <Mail className="h-5 w-5 text-primary" />
              <span className="font-medium">Resend Status</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApiStatus;
