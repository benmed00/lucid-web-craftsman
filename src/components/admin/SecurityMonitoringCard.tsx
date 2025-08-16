import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Activity, Eye, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  user_id?: string;
  ip_address: string | null;
  event_data: any;
  detected_at: string;
  resolved_at?: string | null;
}

interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  ip_address: string | null;
  created_at: string;
  old_values?: any;
  new_values?: any;
}

export const SecurityMonitoringCard = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    unresolvedEvents: 0,
    todayEvents: 0
  });
  const { toast } = useToast();

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSecurityEvents((data || []) as SecurityEvent[]);
      
      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      setStats({
        totalEvents: data?.length || 0,
        criticalEvents: data?.filter(e => e.severity === 'critical').length || 0,
        unresolvedEvents: data?.filter(e => !e.resolved_at).length || 0,
        todayEvents: data?.filter(e => new Date(e.detected_at) >= today).length || 0
      });
    } catch (error) {
      console.error('Error fetching security events:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements de sécurité",
        variant: "destructive"
      });
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les logs d'audit",
        variant: "destructive"
      });
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Résolu par l\'administrateur'
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Événement résolu",
        description: "L'événement de sécurité a été marqué comme résolu"
      });

      fetchSecurityEvents(); // Refresh the data
    } catch (error) {
      console.error('Error resolving security event:', error);
      toast({
        title: "Erreur",
        description: "Impossible de résoudre l'événement",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSecurityEvents(), fetchAuditLogs()]);
      setLoading(false);
    };

    loadData();

    // Set up real-time subscriptions
    const securityEventsSubscription = supabase
      .channel('security_events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'security_events' },
        () => fetchSecurityEvents()
      )
      .subscribe();

    const auditLogsSubscription = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        () => fetchAuditLogs()
      )
      .subscribe();

    return () => {
      securityEventsSubscription.unsubscribe();
      auditLogsSubscription.unsubscribe();
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Monitoring de Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Monitoring de Sécurité
        </CardTitle>
        <CardDescription>
          Surveillance des événements de sécurité et logs d'audit
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Security Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
            <div className="text-sm text-gray-600">Total événements</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
            <div className="text-sm text-red-600">Critiques</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.unresolvedEvents}</div>
            <div className="text-sm text-orange-600">Non résolus</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.todayEvents}</div>
            <div className="text-sm text-blue-600">Aujourd'hui</div>
          </div>
        </div>

        <Tabs defaultValue="security-events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="security-events" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Événements de Sécurité
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Logs d'Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security-events" className="space-y-4">
            {securityEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun événement de sécurité détecté
              </div>
            ) : (
              <div className="space-y-3">
                {securityEvents.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(event.severity)}>
                          {event.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{event.event_type}</span>
                        {event.resolved_at && (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Résolu
                          </Badge>
                        )}
                      </div>
                      {!event.resolved_at && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveSecurityEvent(event.id)}
                        >
                          Résoudre
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(event.detected_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {event.ip_address}
                        </span>
                        {event.user_id && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User ID: {event.user_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                      {event.event_data && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(event.event_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit-logs" className="space-y-4">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun log d'audit disponible
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.action}</Badge>
                        {log.resource_type && (
                          <span className="text-sm text-gray-600">
                            {log.resource_type}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {log.ip_address}
                        </span>
                        {log.user_id && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            User ID: {log.user_id.substring(0, 8)}...
                          </span>
                        )}
                        {log.resource_id && (
                          <span>Resource: {log.resource_id}</span>
                        )}
                      </div>
                      {(log.old_values || log.new_values) && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-500">
                            Voir les détails des modifications
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-2">
                            {log.old_values && (
                              <div>
                                <strong>Anciennes valeurs:</strong>
                                <pre className="whitespace-pre-wrap mt-1">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <strong>Nouvelles valeurs:</strong>
                                <pre className="whitespace-pre-wrap mt-1">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};