import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bell, Loader2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AlertResult {
  success: boolean;
  alerts: {
    expiring: number;
    nearLimit: number;
    total: number;
  };
  expiringCoupons: Array<{ code: string; expiresAt: string }>;
  nearLimitCoupons: Array<{ code: string; usage: string }>;
}

const PromoAlertChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [config, setConfig] = useState({
    days_before_expiry: 3,
    usage_threshold_percent: 80,
    admin_email: '',
  });

  const checkAlerts = async () => {
    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'check-promo-alerts',
        {
          body: config,
        }
      );

      if (error) throw error;

      setResult(data);

      if (data.alerts.total > 0) {
        toast.warning(`${data.alerts.total} alerte(s) détectée(s)`);
      } else {
        toast.success('Aucune alerte détectée');
      }
    } catch (error: any) {
      console.error('Error checking alerts:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Vérifier alertes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Vérification des alertes promo
          </DialogTitle>
          <DialogDescription>
            Vérifiez les codes promo qui approchent leur expiration ou limite
            d'utilisation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days">Jours avant expiration</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="30"
                value={config.days_before_expiry}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    days_before_expiry: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Seuil utilisation (%)</Label>
              <Input
                id="threshold"
                type="number"
                min="50"
                max="99"
                value={config.usage_threshold_percent}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    usage_threshold_percent: parseInt(e.target.value) || 80,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email de notification</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={config.admin_email}
              onChange={(e) =>
                setConfig({ ...config, admin_email: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour vérifier sans envoyer d'email
            </p>
          </div>

          {result && (
            <Card
              className={
                result.alerts.total > 0 ? 'border-warning' : 'border-primary'
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {result.alerts.total > 0 ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      {result.alerts.total} alerte(s) détectée(s)
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Aucune alerte
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.expiringCoupons.length > 0 && (
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1 mb-1">
                      <Clock className="h-4 w-4" />
                      Codes expirant bientôt
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.expiringCoupons.map((c) => (
                        <Badge key={c.code} variant="destructive">
                          {c.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.nearLimitCoupons.length > 0 && (
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Codes proches de la limite
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.nearLimitCoupons.map((c) => (
                        <Badge key={c.code} variant="secondary">
                          {c.code} ({c.usage})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            Fermer
          </Button>
          <Button onClick={checkAlerts} disabled={isChecking}>
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Vérifier maintenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromoAlertChecker;
