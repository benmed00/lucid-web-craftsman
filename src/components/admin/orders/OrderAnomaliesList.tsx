import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnomalySeverityBadge, AnomalyTypeBadge } from './OrderAnomalyBadge';
import { useOrderAnomalies, useResolveAnomaly } from '@/hooks/useOrderManagement';
import type { OrderAnomaly } from '@/types/order.types';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Clock,
} from 'lucide-react';

interface OrderAnomaliesListProps {
  orderId?: string;
  showResolved?: boolean;
  compact?: boolean;
}

export function OrderAnomaliesList({ orderId, showResolved = false, compact = false }: OrderAnomaliesListProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<OrderAnomaly | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const { data: anomalies = [], isLoading } = useOrderAnomalies(orderId, !showResolved);
  const resolveAnomaly = useResolveAnomaly();

  const handleResolve = () => {
    if (!selectedAnomaly || !resolutionNotes.trim()) return;
    
    resolveAnomaly.mutate(
      { anomalyId: selectedAnomaly.id, resolutionNotes },
      {
        onSuccess: () => {
          setSelectedAnomaly(null);
          setResolutionNotes('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Anomalies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unresolvedCount = anomalies.filter(a => !a.resolved_at).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Anomalies
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unresolvedCount}
                </Badge>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className={compact ? 'h-[200px]' : 'h-[350px]'}>
            <div className="space-y-3 pr-4">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-3 rounded-lg border ${
                    anomaly.resolved_at 
                      ? 'bg-muted/50 border-muted' 
                      : anomaly.severity === 'critical'
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                        : 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <AnomalySeverityBadge severity={anomaly.severity} />
                      <AnomalyTypeBadge type={anomaly.anomaly_type} showIcon={false} />
                    </div>
                    {anomaly.resolved_at ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Résolu
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAnomaly(anomaly)}
                      >
                        Résoudre
                      </Button>
                    )}
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1">{anomaly.title}</h4>
                  
                  {anomaly.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {anomaly.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(anomaly.detected_at), 'Pp', { locale: fr })}
                    </span>
                    {anomaly.retry_count > 0 && (
                      <span>
                        Tentatives: {anomaly.retry_count}/{anomaly.max_retries}
                      </span>
                    )}
                  </div>

                  {anomaly.resolved_at && anomaly.resolution_notes && (
                    <div className="mt-2 p-2 bg-background rounded text-xs">
                      <span className="font-medium">Résolution:</span> {anomaly.resolution_notes}
                    </div>
                  )}
                </div>
              ))}

              {anomalies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">Aucune anomalie</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedAnomaly} onOpenChange={() => setSelectedAnomaly(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre l'anomalie</DialogTitle>
            <DialogDescription>
              {selectedAnomaly && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <AnomalySeverityBadge severity={selectedAnomaly.severity} />
                    <AnomalyTypeBadge type={selectedAnomaly.anomaly_type} />
                  </div>
                  <p className="font-medium text-foreground">{selectedAnomaly.title}</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Décrivez les actions prises pour résoudre cette anomalie..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAnomaly(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolutionNotes.trim() || resolveAnomaly.isPending}
            >
              {resolveAnomaly.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Résolution...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marquer comme résolu
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
