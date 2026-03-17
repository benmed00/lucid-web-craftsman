import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Mail,
  Users,
  UserMinus,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  Send,
  AlertCircle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
  thisMonth: number;
}

interface Subscriber {
  id: string;
  email: string;
  status: string;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
}

interface EmailLogEntry {
  id: string;
  template_name: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byTemplate: Record<string, { sent: number; failed: number }>;
}

const AdminNewsletter = () => {
  const [stats, setStats] = useState<NewsletterStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    thisMonth: 0,
  });
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    byTemplate: {},
  });
  const [abandonedCartCount, setAbandonedCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendingAbandonedEmails, setSendingAbandonedEmails] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subscribers
      const { data: subs, error } = await supabase
        .from('newsletter_subscriptions')
        .select('id, email, status, source, created_at, unsubscribed_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const allSubs = subs || [];
      const now = new Date();
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      setSubscribers(allSubs);
      setStats({
        total: allSubs.length,
        active: allSubs.filter((s) => s.status === 'active').length,
        unsubscribed: allSubs.filter((s) => s.status === 'unsubscribed').length,
        thisMonth: allSubs.filter((s) => s.created_at >= monthStart).length,
      });

      // Fetch abandoned cart count
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('checkout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .lt('updated_at', oneHourAgo)
        .not('personal_info', 'is', null)
        .gte('last_completed_step', 1);

      setAbandonedCartCount(count || 0);

      // Fetch email logs (last 30 days)
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select(
          'id, template_name, recipient_email, status, sent_at, created_at, error_message'
        )
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200);

      if (logsError) throw logsError;

      const allLogs = logs || [];
      setEmailLogs(allLogs);

      // Calculate email stats
      const byTemplate: Record<string, { sent: number; failed: number }> = {};
      let sent = 0;
      let failed = 0;
      let pending = 0;

      for (const log of allLogs) {
        if (!byTemplate[log.template_name]) {
          byTemplate[log.template_name] = { sent: 0, failed: 0 };
        }
        if (log.status === 'sent') {
          sent++;
          byTemplate[log.template_name].sent++;
        } else if (log.status === 'failed') {
          failed++;
          byTemplate[log.template_name].failed++;
        } else {
          pending++;
        }
      }

      setEmailStats({
        total: allLogs.length,
        sent,
        failed,
        pending,
        byTemplate,
      });
    } catch (err: any) {
      console.error('Error fetching newsletter data:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendAbandonedCartEmails = async () => {
    setSendingAbandonedEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-abandoned-cart-email'
      );
      if (error) throw error;
      toast.success(`${data?.processed || 0} email(s) de relance envoyé(s)`);
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSendingAbandonedEmails(false);
    }
  };

  // Source filter
  const uniqueSources = useMemo(() => {
    const sources = new Set(subscribers.map((s) => s.source).filter(Boolean));
    return Array.from(sources) as string[];
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    if (sourceFilter === 'all') return subscribers;
    return subscribers.filter((s) => s.source === sourceFilter);
  }, [subscribers, sourceFilter]);

  const templateLabels: Record<string, string> = {
    'order-confirmation': 'Confirmation commande',
    'shipping-notification': 'Expédition',
    'delivery-confirmation': 'Livraison',
    'cancellation-email': 'Annulation',
    'newsletter-welcome': 'Bienvenue newsletter',
    'abandoned-cart': 'Panier abandonné',
    'vip-order-notification': 'Commande VIP',
    'security-alert': 'Alerte sécurité',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Newsletter & Emails
          </h1>
          <p className="text-muted-foreground">
            Abonnés, analytics emails et relances
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Actualiser
        </Button>
      </div>

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">Abonnés</TabsTrigger>
          <TabsTrigger value="emails">Emails Analytics</TabsTrigger>
          <TabsTrigger value="carts">Paniers abandonnés</TabsTrigger>
        </TabsList>

        {/* ========== SUBSCRIBERS TAB ========== */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.total}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Actifs
                </CardTitle>
                <Mail className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.active}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Désabonnés
                </CardTitle>
                <UserMinus className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {stats.unsubscribed}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ce mois
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stats.thisMonth}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Source filter + subscriber table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Abonnés</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Source :
                  </span>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {uniqueSources.map((src) => (
                        <SelectItem key={src} value={src}>
                          {src}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sub.status === 'active' ? 'default' : 'destructive'
                          }
                        >
                          {sub.status === 'active' ? 'Actif' : 'Désabonné'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.source ? (
                          <Badge variant="outline">{sub.source}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sub.created_at), 'dd MMM yyyy', {
                          locale: fr,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSubscribers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        Aucun abonné
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== EMAIL ANALYTICS TAB ========== */}
        <TabsContent value="emails" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total envois (30j)
                </CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {emailStats.total}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Envoyés
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {emailStats.sent}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Échoués
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {emailStats.failed}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taux succès
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {emailStats.total > 0
                    ? `${Math.round((emailStats.sent / emailStats.total) * 100)}%`
                    : '—'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By template breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Par template</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">Envoyés</TableHead>
                    <TableHead className="text-right">Échoués</TableHead>
                    <TableHead className="text-right">Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(emailStats.byTemplate)
                    .sort(
                      ([, a], [, b]) => b.sent + b.failed - (a.sent + a.failed)
                    )
                    .map(([template, data]) => {
                      const total = data.sent + data.failed;
                      const rate =
                        total > 0 ? Math.round((data.sent / total) * 100) : 0;
                      return (
                        <TableRow key={template}>
                          <TableCell className="font-medium">
                            {templateLabels[template] || template}
                          </TableCell>
                          <TableCell className="text-right text-primary">
                            {data.sent}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {data.failed}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                rate >= 90
                                  ? 'default'
                                  : rate >= 70
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {Object.keys(emailStats.byTemplate).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        Aucun email envoyé ces 30 derniers jours
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent email logs */}
          <Card>
            <CardHeader>
              <CardTitle>Derniers emails</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destinataire</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">
                        {log.recipient_email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {templateLabels[log.template_name] || log.template_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === 'sent'
                              ? 'default'
                              : log.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {log.status === 'sent'
                            ? 'Envoyé'
                            : log.status === 'failed'
                              ? 'Échoué'
                              : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', {
                          locale: fr,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {emailLogs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        Aucun email récent
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ABANDONED CARTS TAB ========== */}
        <TabsContent value="carts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Paniers abandonnés</CardTitle>
                  {abandonedCartCount > 0 && (
                    <Badge variant="destructive">{abandonedCartCount}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleSendAbandonedCartEmails}
                  disabled={sendingAbandonedEmails || abandonedCartCount === 0}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendingAbandonedEmails ? 'Envoi...' : 'Envoyer les relances'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {abandonedCartCount > 0
                  ? `${abandonedCartCount} panier(s) abandonné(s) depuis plus d'une heure avec email renseigné. Cliquez pour envoyer un email de relance automatique via Brevo.`
                  : 'Aucun panier abandonné à relancer pour le moment.'}
              </p>

              {/* Show recent abandoned cart emails */}
              {emailLogs.filter((l) => l.template_name === 'abandoned-cart')
                .length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Relances récentes
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs
                        .filter((l) => l.template_name === 'abandoned-cart')
                        .slice(0, 10)
                        .map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium text-sm">
                              {log.recipient_email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.status === 'sent'
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {log.status === 'sent' ? 'Envoyé' : 'Échoué'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(
                                new Date(log.created_at),
                                'dd MMM yyyy HH:mm',
                                { locale: fr }
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminNewsletter;
