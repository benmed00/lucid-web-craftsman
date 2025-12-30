import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Bell,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  source_ip: string | null;
  user_id: string | null;
  user_email: string | null;
  metadata: Record<string, any>;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  notified_at: string | null;
  created_at: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'medium':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Shield className="h-5 w-5 text-blue-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  const variants: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  
  return (
    <Badge className={`${variants[severity] || variants.low} uppercase text-xs`}>
      {severity}
    </Badge>
  );
};

export const SecurityAlertsCard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Fetch security alerts
  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as SecurityAlert[];
    },
  });

  // Trigger alert notification manually
  const triggerNotification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('security-alert-notification');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.alertsProcessed > 0) {
        toast.success(`${data.alertsProcessed} alerte(s) envoyée(s) par email`);
      } else {
        toast.info('Aucune alerte en attente');
      }
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Resolve alert
  const resolveAlert = async () => {
    if (!selectedAlert) return;
    
    setIsResolving(true);
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', selectedAlert.id);

      if (error) throw error;

      toast.success('Alerte marquée comme résolue');
      setSelectedAlert(null);
      setResolutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsResolving(false);
    }
  };

  const unresolvedAlerts = alerts?.filter(a => !a.is_resolved) || [];
  const criticalCount = unresolvedAlerts.filter(a => a.severity === 'critical').length;
  const highCount = unresolvedAlerts.filter(a => a.severity === 'high').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Alertes de Sécurité</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={() => triggerNotification.mutate()}
                disabled={triggerNotification.isPending}
              >
                <Bell className="h-4 w-4 mr-1" />
                Envoyer Alertes
              </Button>
            </div>
          </div>
          <CardDescription>
            Surveillance des tentatives d'accès non autorisées et activités suspectes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <span className="text-2xl font-bold">{unresolvedAlerts.length}</span>
              <span className="text-sm text-muted-foreground">Non résolues</span>
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{criticalCount} Critique(s)</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">{highCount} Haute(s)</span>
              </div>
            )}
          </div>

          {/* Alert List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Chargement des alertes...
              </div>
            ) : alerts?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Aucune alerte de sécurité</p>
              </div>
            ) : (
              alerts?.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                    alert.is_resolved ? 'opacity-50 bg-muted/30' : ''
                  } ${
                    alert.severity === 'critical' ? 'border-red-200 bg-red-50/50' :
                    alert.severity === 'high' ? 'border-orange-200 bg-orange-50/50' : ''
                  }`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(alert.severity)}
                      {alert.is_resolved && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Résolu
                        </Badge>
                      )}
                      {!alert.notified_at && !alert.is_resolved && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{alert.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(alert.created_at).toLocaleString('fr-FR')}
                      {alert.source_ip && (
                        <span className="ml-2">IP: {alert.source_ip}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlert && getSeverityIcon(selectedAlert.severity)}
              Détails de l'Alerte
            </DialogTitle>
            <DialogDescription>
              Informations complètes sur cette alerte de sécurité
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getSeverityBadge(selectedAlert.severity)}
                {selectedAlert.is_resolved && (
                  <Badge variant="outline" className="text-green-600">Résolu</Badge>
                )}
              </div>

              <div>
                <h4 className="font-semibold">{selectedAlert.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-mono text-xs">{selectedAlert.alert_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Créé le:</span>
                  <p>{new Date(selectedAlert.created_at).toLocaleString('fr-FR')}</p>
                </div>
                {selectedAlert.source_ip && (
                  <div>
                    <span className="text-muted-foreground">IP Source:</span>
                    <p className="font-mono">{selectedAlert.source_ip}</p>
                  </div>
                )}
                {selectedAlert.user_id && (
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <p className="font-mono text-xs truncate">{selectedAlert.user_id}</p>
                  </div>
                )}
              </div>

              {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Métadonnées:</span>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedAlert.is_resolved && (
                <div>
                  <label className="text-sm font-medium">Notes de résolution:</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Décrivez les actions prises pour résoudre cette alerte..."
                    className="mt-1"
                  />
                </div>
              )}

              {selectedAlert.is_resolved && selectedAlert.resolution_notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes de résolution:</span>
                  <p className="mt-1 p-2 bg-green-50 rounded text-sm">{selectedAlert.resolution_notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAlert(null)}>
              Fermer
            </Button>
            {selectedAlert && !selectedAlert.is_resolved && (
              <Button onClick={resolveAlert} disabled={isResolving}>
                {isResolving ? 'Résolution...' : 'Marquer comme résolu'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecurityAlertsCard;
