/**
 * Admin Checkout Sessions Tab
 * Displays abandoned and in-progress checkout sessions with full form data visibility
 */

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  MapPin,
  Tag,
  ShoppingCart,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Types
interface CheckoutSession {
  id: string;
  guest_id: string | null;
  user_id: string | null;
  current_step: number;
  last_completed_step: number;
  status: 'in_progress' | 'completed' | 'abandoned' | 'payment_failed';
  personal_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  } | null;
  shipping_info: {
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
    country: string;
  } | null;
  promo_code: string | null;
  promo_code_valid: boolean | null;
  promo_discount_type: string | null;
  promo_discount_value: number | null;
  promo_discount_applied: number | null;
  promo_free_shipping: boolean;
  cart_items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }> | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  client_ip: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  abandoned_at: string | null;
  completed_at: string | null;
}

// Step labels
const STEP_LABELS: Record<number, string> = {
  0: 'Non commencé',
  1: 'Informations personnelles',
  2: 'Livraison',
  3: 'Paiement',
};

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  in_progress: { label: 'En cours', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  completed: { label: 'Complété', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  abandoned: { label: 'Abandonné', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  payment_failed: { label: 'Paiement échoué', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

// Device icon helper
const getDeviceIcon = (deviceType: string | null) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

// Country labels
const COUNTRY_LABELS: Record<string, string> = {
  FR: 'France',
  BE: 'Belgique',
  CH: 'Suisse',
  MC: 'Monaco',
  LU: 'Luxembourg',
};

export function CheckoutSessionsTab() {
  const [selectedSession, setSelectedSession] = useState<CheckoutSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch checkout sessions
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['checkout-sessions', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('checkout_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map database types to component types
      return (data || []).map(row => ({
        id: row.id,
        guest_id: row.guest_id,
        user_id: row.user_id,
        current_step: row.current_step,
        last_completed_step: row.last_completed_step,
        status: row.status as CheckoutSession['status'],
        personal_info: row.personal_info as CheckoutSession['personal_info'],
        shipping_info: row.shipping_info as CheckoutSession['shipping_info'],
        promo_code: row.promo_code,
        promo_code_valid: row.promo_code_valid,
        promo_discount_type: row.promo_discount_type,
        promo_discount_value: row.promo_discount_value,
        promo_discount_applied: row.promo_discount_applied,
        promo_free_shipping: row.promo_free_shipping || false,
        cart_items: row.cart_items as CheckoutSession['cart_items'],
        subtotal: row.subtotal || 0,
        shipping_cost: row.shipping_cost || 0,
        total: row.total || 0,
        device_type: row.device_type,
        browser: row.browser,
        os: row.os,
        client_ip: row.client_ip,
        order_id: row.order_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        abandoned_at: row.abandoned_at,
        completed_at: row.completed_at,
      }));
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  // Stats
  const stats = {
    total: sessions.length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
    abandoned: sessions.filter(s => s.status === 'abandoned').length,
    paymentFailed: sessions.filter(s => s.status === 'payment_failed').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    withPromo: sessions.filter(s => s.promo_code).length,
  };

  // Calculate potential lost revenue
  const potentialLostRevenue = sessions
    .filter(s => s.status === 'abandoned' || s.status === 'payment_failed')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{stats.abandoned}</div>
            <p className="text-xs text-muted-foreground">Abandonnés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.paymentFailed}</div>
            <p className="text-xs text-muted-foreground">Paiements échoués</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {(potentialLostRevenue / 100).toFixed(2)} €
            </div>
            <p className="text-xs text-muted-foreground">Revenus potentiels perdus</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="abandoned">Abandonnés</SelectItem>
            <SelectItem value="payment_failed">Paiement échoué</SelectItem>
            <SelectItem value="completed">Complétés</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>

        <div className="flex-1" />
        
        <Badge variant="outline">
          <Tag className="h-3 w-3 mr-1" />
          {stats.withPromo} avec code promo
        </Badge>
      </div>

      {/* Sessions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Dernière étape</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Promo</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const statusCfg = STATUS_CONFIG[session.status] || STATUS_CONFIG.in_progress;
              
              return (
                <TableRow
                  key={session.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedSession(session)}
                >
                  <TableCell>
                    <span className="font-mono text-xs">
                      {session.id.slice(0, 8).toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    {session.personal_info ? (
                      <div>
                        <p className="font-medium text-sm">
                          {session.personal_info.first_name} {session.personal_info.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.personal_info.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Non renseigné
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      Étape {session.last_completed_step}/3
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {STEP_LABELS[session.last_completed_step]}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusCfg.variant} className="gap-1">
                      {statusCfg.icon}
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {session.promo_code ? (
                      <div>
                        <Badge variant="secondary" className="text-xs">
                          {session.promo_code}
                        </Badge>
                        {session.promo_code_valid === false && (
                          <span className="text-xs text-red-500 block">Invalide</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {((session.total || 0) / 100).toFixed(2)} €
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.created_at), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}

            {sessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucune session de checkout trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Session Details Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Session de Checkout
              {selectedSession && (
                <Badge variant={STATUS_CONFIG[selectedSession.status]?.variant || 'default'}>
                  {STATUS_CONFIG[selectedSession.status]?.label}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedSession && (
            <div className="mt-6 space-y-6">
              {/* Session Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Informations de session
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID Session:</span>
                    <span className="font-mono">{selectedSession.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créée:</span>
                    <span>{format(new Date(selectedSession.created_at), 'PPP à HH:mm', { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernière mise à jour:</span>
                    <span>{format(new Date(selectedSession.updated_at), 'PPP à HH:mm', { locale: fr })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Étape actuelle:</span>
                    <span>Étape {selectedSession.current_step} - {STEP_LABELS[selectedSession.current_step]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dernière étape complétée:</span>
                    <span>{STEP_LABELS[selectedSession.last_completed_step]}</span>
                  </div>
                  
                  {/* Device info */}
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(selectedSession.device_type)}
                    <span>{selectedSession.device_type || 'Unknown'}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{selectedSession.browser || 'Unknown'}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{selectedSession.os || 'Unknown'}</span>
                  </div>
                  {selectedSession.client_ip && (
                    <div className="text-xs text-muted-foreground">
                      IP: {selectedSession.client_ip}
                    </div>
                  )}

                  {/* Order link if completed */}
                  {selectedSession.order_id && (
                    <>
                      <Separator className="my-2" />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Commande liée:</span>
                        <Button variant="link" size="sm" className="h-auto p-0" asChild>
                          <a href={`/admin/orders-enhanced?order=${selectedSession.order_id}`}>
                            {selectedSession.order_id.slice(0, 8).toUpperCase()}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informations personnelles
                    {selectedSession.personal_info ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedSession.personal_info ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nom:</span>
                        <span className="font-medium">
                          {selectedSession.personal_info.first_name} {selectedSession.personal_info.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{selectedSession.personal_info.email}</span>
                      </div>
                      {selectedSession.personal_info.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Téléphone:</span>
                          <span>{selectedSession.personal_info.phone}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Non renseigné</p>
                  )}
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Adresse de livraison
                    {selectedSession.shipping_info ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedSession.shipping_info ? (
                    <div className="space-y-1">
                      <p>{selectedSession.shipping_info.address_line1}</p>
                      {selectedSession.shipping_info.address_line2 && (
                        <p className="text-muted-foreground">{selectedSession.shipping_info.address_line2}</p>
                      )}
                      <p>
                        {selectedSession.shipping_info.postal_code} {selectedSession.shipping_info.city}
                      </p>
                      <p className="font-medium">
                        {COUNTRY_LABELS[selectedSession.shipping_info.country] || selectedSession.shipping_info.country}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Non renseignée</p>
                  )}
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Code Promo
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedSession.promo_code ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Code:</span>
                        <Badge 
                          variant={selectedSession.promo_code_valid ? 'secondary' : 'destructive'}
                        >
                          {selectedSession.promo_code}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Statut:</span>
                        <span className={selectedSession.promo_code_valid ? 'text-green-600' : 'text-red-600'}>
                          {selectedSession.promo_code_valid ? 'Valide' : 'Invalide'}
                        </span>
                      </div>
                      {selectedSession.promo_discount_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span>
                            {selectedSession.promo_discount_type === 'percentage' 
                              ? `${selectedSession.promo_discount_value}%` 
                              : `${selectedSession.promo_discount_value} €`}
                          </span>
                        </div>
                      )}
                      {selectedSession.promo_discount_applied && (
                        <div className="flex justify-between font-medium text-green-600">
                          <span>Remise appliquée:</span>
                          <span>-{(selectedSession.promo_discount_applied / 100).toFixed(2)} €</span>
                        </div>
                      )}
                      {selectedSession.promo_free_shipping && (
                        <Badge variant="outline" className="mt-2">
                          Livraison gratuite incluse
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Aucun code promo utilisé</p>
                  )}
                </CardContent>
              </Card>

              {/* Cart Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Panier ({selectedSession.cart_items?.length || 0} articles)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  {selectedSession.cart_items && selectedSession.cart_items.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSession.cart_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {(item.unit_price / 100).toFixed(2)} €
                            </p>
                          </div>
                          <span className="font-medium">
                            {(item.total_price / 100).toFixed(2)} €
                          </span>
                        </div>
                      ))}
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sous-total:</span>
                          <span>{(selectedSession.subtotal / 100).toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Livraison:</span>
                          <span>
                            {selectedSession.shipping_cost === 0 
                              ? 'Gratuite' 
                              : `${(selectedSession.shipping_cost / 100).toFixed(2)} €`}
                          </span>
                        </div>
                        {selectedSession.promo_discount_applied && selectedSession.promo_discount_applied > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Remise:</span>
                            <span>-{(selectedSession.promo_discount_applied / 100).toFixed(2)} €</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-base pt-2 border-t">
                          <span>Total:</span>
                          <span>{(selectedSession.total / 100).toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Panier non capturé</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CheckoutSessionsTab;
