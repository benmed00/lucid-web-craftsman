import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const AdminNewsletter = () => {
  const [stats, setStats] = useState<NewsletterStats>({
    total: 0,
    active: 0,
    unsubscribed: 0,
    thisMonth: 0,
  });
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [abandonedCartCount, setAbandonedCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendingAbandonedEmails, setSendingAbandonedEmails] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all subscribers (admin only via RLS)
      const { data: subs, error } = await supabase
        .from('newsletter_subscriptions')
        .select('id, email, status, source, created_at, unsubscribed_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const allSubs = subs || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
      toast.success(
        `${data?.processed || 0} email(s) de relance envoyé(s)`
      );
      fetchData();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSendingAbandonedEmails(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Newsletter</h1>
          <p className="text-muted-foreground">
            Suivi des abonnés et relances panier abandonné
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total abonnés
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
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
            <div className="text-2xl font-bold text-primary">{stats.active}</div>
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
            <div className="text-2xl font-bold text-foreground">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Abandoned carts */}
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
              ? `${abandonedCartCount} panier(s) abandonné(s) depuis plus d'une heure avec email renseigné.`
              : 'Aucun panier abandonné à relancer.'}
          </p>
        </CardContent>
      </Card>

      {/* Subscribers table */}
      <Card>
        <CardHeader>
          <CardTitle>Derniers abonnés</CardTitle>
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
              {subscribers.map((sub) => (
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
                  <TableCell className="text-muted-foreground">
                    {sub.source || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(sub.created_at), 'dd MMM yyyy', {
                      locale: fr,
                    })}
                  </TableCell>
                </TableRow>
              ))}
              {subscribers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Aucun abonné
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNewsletter;
