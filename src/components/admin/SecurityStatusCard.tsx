import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export const SecurityStatusCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Statut de sécurité
        </CardTitle>
        <CardDescription>
          Récapitulatif des mesures de sécurité mises en place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Base de données sécurisée</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">RLS activé</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Validation des entrées</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Protection CSRF</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Limitation du taux</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Journal d'audit</span>
              <Badge
                variant="default"
                className="bg-status-success/10 text-status-success"
              >
                Actif
              </Badge>
            </div>
          </div>
        </div>

        <Alert className="bg-status-warning/10 border-status-warning/20">
          <AlertTriangle className="h-4 w-4 text-status-warning" />
          <AlertDescription className="text-status-warning">
            <strong>Configuration manuelle requise:</strong>
            <br />
            • Activez la protection contre les mots de passe divulgués dans
            Supabase
            <br />• Configurez l'expiration OTP à 10-15 minutes
          </AlertDescription>
        </Alert>

        <Alert className="bg-status-info/10 border-status-info/20">
          <Info className="h-4 w-4 text-status-info" />
          <AlertDescription className="text-status-info">
            La sécurité est renforcée avec validation des entrées, protection
            XSS, limitation du taux et audit des actions administrateur.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
