import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Settings, Trash2, Save, RefreshCw, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RateLimitEntry {
  id: string;
  identifier: string;
  action_type: string;
  attempts: number;
  window_start: string;
  created_at: string;
}

interface RateLimitConfig {
  action_type: string;
  max_attempts: number;
  window_minutes: number;
  description: string;
}

const DEFAULT_RATE_LIMITS: RateLimitConfig[] = [
  { action_type: 'contact_submission', max_attempts: 5, window_minutes: 60, description: 'Soumissions formulaire contact' },
  { action_type: 'login_attempt', max_attempts: 5, window_minutes: 15, description: 'Tentatives de connexion' },
  { action_type: 'password_reset', max_attempts: 3, window_minutes: 60, description: 'Réinitialisation mot de passe' },
  { action_type: 'api_request', max_attempts: 100, window_minutes: 1, description: 'Requêtes API' },
  { action_type: 'cart_operation', max_attempts: 50, window_minutes: 5, description: 'Opérations panier' }
];

export const RateLimitsConfig: React.FC = () => {
  const [entries, setEntries] = useState<RateLimitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<RateLimitConfig[]>(DEFAULT_RATE_LIMITS);

  const fetchRateLimits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries((data || []) as RateLimitEntry[]);
    } catch (error) {
      console.error('Error fetching rate limits:', error);
      toast.error('Erreur lors du chargement des limites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimits();
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'rate_limits_config')
        .maybeSingle();

      if (!error && data?.setting_value) {
        const storedConfigs = data.setting_value as unknown as RateLimitConfig[];
        if (Array.isArray(storedConfigs) && storedConfigs.length > 0) {
          setConfigs(storedConfigs);
        }
      }
    } catch (error) {
      console.error('Error loading rate limit configs:', error);
    }
  };

  const saveConfigs = async () => {
    setSaving(true);
    try {
      // First try to update existing
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'rate_limits_config')
        .maybeSingle();

      const configsJson = JSON.parse(JSON.stringify(configs));

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({
            setting_value: configsJson,
            description: 'Configuration des limites de taux'
          })
          .eq('setting_key', 'rate_limits_config');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert([{
            setting_key: 'rate_limits_config',
            setting_value: configsJson,
            description: 'Configuration des limites de taux'
          }]);

        if (error) throw error;
      }
      
      toast.success('Configuration sauvegardée');
    } catch (error) {
      console.error('Error saving configs:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const clearOldEntries = async () => {
    try {
      // Delete entries older than 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('rate_limits')
        .delete()
        .lt('window_start', cutoff);

      if (error) throw error;
      toast.success('Anciennes entrées supprimées');
      fetchRateLimits();
    } catch (error) {
      console.error('Error clearing entries:', error);
      toast.error('Erreur lors du nettoyage');
    }
  };

  const updateConfig = (index: number, field: keyof RateLimitConfig, value: string | number) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };

  const getAttemptsBadge = (attempts: number, actionType: string) => {
    const config = configs.find(c => c.action_type === actionType);
    const maxAttempts = config?.max_attempts || 10;
    const ratio = attempts / maxAttempts;

    if (ratio >= 1) return <Badge variant="destructive">{attempts} (bloqué)</Badge>;
    if (ratio >= 0.8) return <Badge className="bg-status-warning text-status-warning-foreground">{attempts}</Badge>;
    return <Badge variant="secondary">{attempts}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    const type = entry.action_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(entry);
    return acc;
  }, {} as Record<string, RateLimitEntry[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Limites de taux (Rate Limits)
        </CardTitle>
        <CardDescription>
          Configurez les limites d'utilisation pour protéger votre application contre les abus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration des limites
          </h3>
          
          <div className="grid gap-4">
            {configs.map((config, index) => (
              <div key={config.action_type} className="grid grid-cols-12 gap-3 items-center p-3 bg-muted/50 rounded-lg">
                <div className="col-span-4">
                  <Label className="text-sm font-medium">{config.description}</Label>
                  <p className="text-xs text-muted-foreground">{config.action_type}</p>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Max tentatives</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={config.max_attempts}
                    onChange={(e) => updateConfig(index, 'max_attempts', parseInt(e.target.value) || 1)}
                    className="h-8"
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Fenêtre (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={config.window_minutes}
                    onChange={(e) => updateConfig(index, 'window_minutes', parseInt(e.target.value) || 1)}
                    className="h-8"
                  />
                </div>
                <div className="col-span-2 text-right">
                  <Badge variant="outline">
                    {config.max_attempts}/{config.window_minutes}min
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfigs} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Sauvegarder la configuration
            </Button>
          </div>
        </div>

        {/* Current Rate Limit Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Entrées actuelles ({entries.length})
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchRateLimits} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={clearOldEntries}>
                <Trash2 className="h-4 w-4 mr-2" />
                Nettoyer (&gt;24h)
              </Button>
            </div>
          </div>

          {/* Summary by action type */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.entries(groupedEntries).map(([type, typeEntries]) => (
              <div key={type} className="p-2 bg-muted rounded text-center">
                <div className="text-lg font-bold">{typeEntries.length}</div>
                <div className="text-xs text-muted-foreground truncate">{type}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entrée de limite de taux active
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type d'action</TableHead>
                  <TableHead>Identifiant</TableHead>
                  <TableHead>Tentatives</TableHead>
                  <TableHead>Début fenêtre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 20).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="outline">{entry.action_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[150px]">
                      {entry.identifier}
                    </TableCell>
                    <TableCell>
                      {getAttemptsBadge(entry.attempts, entry.action_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(entry.window_start)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {entries.length > 20 && (
            <p className="text-sm text-muted-foreground text-center">
              Affichage des 20 premières entrées sur {entries.length}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RateLimitsConfig;
