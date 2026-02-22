import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Eye,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FraudAssessmentPanelProps {
  orderId: string;
}

interface FraudAssessment {
  id: string;
  order_id: string;
  total_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  triggered_rules: Array<{
    rule_name: string;
    rule_type: string;
    score: number;
    description: string;
    details?: Record<string, unknown>;
  }>;
  auto_action: 'approve' | 'hold' | 'reject' | 'manual_review';
  manual_override: boolean;
  override_by: string | null;
  override_reason: string | null;
  override_at: string | null;
  created_at: string;
}

const riskLevelConfig = {
  low: { 
    color: 'text-green-600', 
    bgColor: 'bg-green-100', 
    icon: ShieldCheck,
    label: 'Risque faible' 
  },
  medium: { 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100', 
    icon: Eye,
    label: 'Risque moyen' 
  },
  high: { 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100', 
    icon: ShieldAlert,
    label: 'Risque élevé' 
  },
  critical: { 
    color: 'text-red-600', 
    bgColor: 'bg-red-100', 
    icon: ShieldX,
    label: 'Risque critique' 
  },
};

export function FraudAssessmentPanel({ orderId }: FraudAssessmentPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const queryClient = useQueryClient();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['fraud-assessment', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_assessments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Parse triggered_rules from JSON - cast to unknown first to avoid type conflicts
      const rawRules = data.triggered_rules as unknown;
      const triggeredRules = Array.isArray(rawRules) 
        ? (rawRules as FraudAssessment['triggered_rules'])
        : [];
      
      return {
        id: data.id,
        order_id: data.order_id,
        total_score: data.total_score,
        risk_level: data.risk_level as FraudAssessment['risk_level'],
        auto_action: data.auto_action as FraudAssessment['auto_action'],
        triggered_rules: triggeredRules,
        manual_override: data.manual_override,
        override_by: data.override_by,
        override_reason: data.override_reason,
        override_at: data.override_at,
        created_at: data.created_at,
      } satisfies FraudAssessment;
    },
    enabled: !!orderId,
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ action }: { action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.rpc('override_fraud_assessment', {
        p_order_id: orderId,
        p_action: action,
        p_reason: overrideReason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' 
        ? 'Commande approuvée manuellement' 
        : 'Commande rejetée'
      );
      queryClient.invalidateQueries({ queryKey: ['fraud-assessment', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setOverrideReason('');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Évaluation fraude
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Évaluation fraude
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucune évaluation de fraude disponible pour cette commande.
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = riskLevelConfig[assessment.risk_level];
  const Icon = config.icon;
  const triggeredRules = assessment.triggered_rules || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon className={cn("h-4 w-4", config.color)} />
            Évaluation fraude
          </CardTitle>
          <Badge className={cn(config.bgColor, config.color, "border-0")}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Score de risque</span>
          <span className={cn("text-2xl font-bold", config.color)}>
            {assessment.total_score}/100
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all",
              assessment.total_score >= 70 ? 'bg-red-500' :
              assessment.total_score >= 50 ? 'bg-orange-500' :
              assessment.total_score >= 25 ? 'bg-yellow-500' : 'bg-green-500'
            )}
            style={{ width: `${Math.min(assessment.total_score, 100)}%` }}
          />
        </div>

        {/* Auto Action */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Action automatique</span>
          <Badge variant={
            assessment.auto_action === 'approve' ? 'default' :
            assessment.auto_action === 'hold' ? 'secondary' :
            assessment.auto_action === 'reject' ? 'destructive' : 'outline'
          }>
            {assessment.auto_action === 'approve' && 'Approuvé'}
            {assessment.auto_action === 'hold' && 'En attente'}
            {assessment.auto_action === 'reject' && 'Rejeté'}
            {assessment.auto_action === 'manual_review' && 'Revue manuelle'}
          </Badge>
        </div>

        {/* Manual Override Status */}
        {assessment.manual_override && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Décision manuelle appliquée
            </div>
            {assessment.override_reason && (
              <p className="text-xs text-muted-foreground mt-1">
                Raison: {assessment.override_reason}
              </p>
            )}
            {assessment.override_at && (
              <p className="text-xs text-muted-foreground">
                Le {new Date(assessment.override_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        )}

        {/* Triggered Rules */}
        {triggeredRules.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-medium w-full justify-between hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                {triggeredRules.length} règle(s) déclenchée(s)
              </span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-2">
                {triggeredRules.map((rule, index) => (
                  <div 
                    key={index}
                    className="p-2 bg-muted/50 rounded text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{rule.description}</span>
                      <Badge variant="outline" className="text-xs">
                        +{rule.score} pts
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      Type: {rule.rule_type}
                    </span>
                    {rule.details && Object.keys(rule.details).length > 0 && (
                      <div className="mt-1 text-muted-foreground">
                        {Object.entries(rule.details).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Override Actions */}
        {!assessment.manual_override && ['hold', 'manual_review'].includes(assessment.auto_action) && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Décision manuelle</p>
            <Textarea
              placeholder="Raison de la décision (obligatoire)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => overrideMutation.mutate({ action: 'approve' })}
                disabled={!overrideReason.trim() || overrideMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => overrideMutation.mutate({ action: 'reject' })}
                disabled={!overrideReason.trim() || overrideMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
