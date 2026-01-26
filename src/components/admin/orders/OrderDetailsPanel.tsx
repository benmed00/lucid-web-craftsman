import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderStatusSelect } from './OrderStatusSelect';
import { OrderHistoryTimeline } from './OrderHistoryTimeline';
import { OrderAnomaliesList } from './OrderAnomaliesList';
import { FraudAssessmentPanel } from './FraudAssessmentPanel';
import { useOrder } from '@/hooks/useOrderManagement';
import type { OrderStatus } from '@/types/order.types';
import { Skeleton } from '@/components/ui/skeleton';
import { SendShippingEmailButton } from '@/components/admin/SendShippingEmailButton';
import { SendDeliveryEmailButton } from '@/components/admin/SendDeliveryEmailButton';
import { SendCancellationEmailButton } from '@/components/admin/SendCancellationEmailButton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  MapPin,
  CreditCard,
  Package,
  Truck,
  AlertTriangle,
  ExternalLink,
  Copy,
  ShieldAlert,
  Mail,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderDetailsPanelProps {
  orderId: string;
  onClose?: () => void;
}

export function OrderDetailsPanel({ orderId, onClose }: OrderDetailsPanelProps) {
  const { data: order, isLoading, refetch } = useOrder(orderId);
  const [isEditingTracking, setIsEditingTracking] = useState(false);
  const [trackingForm, setTrackingForm] = useState({
    carrier: '',
    tracking_number: '',
    tracking_url: '',
  });
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast.success('ID copié');
  };

  const handleEditTracking = () => {
    if (order) {
      setTrackingForm({
        carrier: order.carrier || '',
        tracking_number: order.tracking_number || '',
        tracking_url: order.tracking_url || '',
      });
      setIsEditingTracking(true);
    }
  };

  const handleSaveTracking = async () => {
    setIsSavingTracking(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          carrier: trackingForm.carrier || null,
          tracking_number: trackingForm.tracking_number || null,
          tracking_url: trackingForm.tracking_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Informations de suivi mises à jour');
      setIsEditingTracking(false);
      refetch();
    } catch (error) {
      console.error('Error updating tracking:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleEditNotes = () => {
    setInternalNotes(order?.internal_notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          internal_notes: internalNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Notes mises à jour');
      setIsEditingNotes(false);
      refetch();
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Commande non trouvée
      </div>
    );
  }

  const shippingAddress = order.shipping_address as Record<string, string> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              Commande #{orderId.slice(0, 8).toUpperCase()}
            </h2>
            <Button variant="ghost" size="icon" onClick={copyOrderId} className="h-6 w-6">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Créée le {format(new Date(order.created_at), 'PPP à HH:mm', { locale: fr })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {order.has_anomaly && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Anomalie
            </Badge>
          )}
          <OrderStatusSelect
            orderId={orderId}
            currentStatus={order.order_status as OrderStatus}
            onStatusChange={() => refetch()}
          />
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="fraud" className="flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Fraude
          </TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-1">
            Anomalies
            {order.anomaly_count > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {order.anomaly_count}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  {shippingAddress?.first_name && (
                    <p className="font-medium">
                      {shippingAddress.first_name} {shippingAddress.last_name}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    ID: {order.user_id?.slice(0, 8) || 'Invité'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p className="font-bold text-lg">
                    {((order.amount || 0) / 100).toFixed(2)} {order.currency?.toUpperCase()}
                  </p>
                  <p className="text-muted-foreground">
                    {order.payment_method || 'Non spécifié'}
                  </p>
                  {order.payment_reference && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Réf: {order.payment_reference.slice(0, 20)}...
                    </p>
                  )}
                  {order.fraud_score !== null && order.fraud_score > 0 && (
                    <div className="mt-2">
                      <Badge 
                        variant={order.fraud_score > 50 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        Score fraude: {order.fraud_score}%
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shippingAddress ? (
                  <div className="text-sm space-y-1">
                    <p>{shippingAddress.address_line1}</p>
                    {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                    <p>{shippingAddress.postal_code} {shippingAddress.city}</p>
                    <p>{shippingAddress.country}</p>
                    {shippingAddress.phone && (
                      <p className="text-muted-foreground">{shippingAddress.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Non spécifiée</p>
                )}
              </CardContent>
            </Card>

            {/* Tracking */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Suivi
                  </div>
                  {!isEditingTracking && (
                    <Button variant="ghost" size="sm" onClick={handleEditTracking}>
                      Modifier
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingTracking ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="carrier" className="text-xs">Transporteur</Label>
                      <Input
                        id="carrier"
                        value={trackingForm.carrier}
                        onChange={(e) => setTrackingForm(prev => ({ ...prev, carrier: e.target.value }))}
                        placeholder="Colissimo, DHL, etc."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tracking_number" className="text-xs">Numéro de suivi</Label>
                      <Input
                        id="tracking_number"
                        value={trackingForm.tracking_number}
                        onChange={(e) => setTrackingForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                        placeholder="ABC123456789"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tracking_url" className="text-xs">URL de suivi</Label>
                      <Input
                        id="tracking_url"
                        value={trackingForm.tracking_url}
                        onChange={(e) => setTrackingForm(prev => ({ ...prev, tracking_url: e.target.value }))}
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSaveTracking}
                        disabled={isSavingTracking}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Enregistrer
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsEditingTracking(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : order.tracking_number ? (
                  <div className="text-sm space-y-2">
                    <p>
                      <span className="text-muted-foreground">Transporteur:</span>{' '}
                      {order.carrier || 'N/A'}
                    </p>
                    <p className="font-mono text-xs">{order.tracking_number}</p>
                    {order.tracking_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Suivre le colis
                        </a>
                      </Button>
                    )}
                    {order.estimated_delivery && (
                      <p className="text-xs text-muted-foreground">
                        Livraison estimée: {format(new Date(order.estimated_delivery), 'PP', { locale: fr })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Pas encore expédié - Cliquez sur "Modifier" pour ajouter les infos
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Articles ({order.order_items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {order.order_items?.map((item) => {
                  const snapshot = item.product_snapshot as Record<string, unknown> | null;
                  return (
                    <div key={item.id} className="py-3 flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {snapshot?.name as string || 'Produit'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Qté: {item.quantity} × {Number(item.unit_price).toFixed(2)} €
                        </p>
                      </div>
                      <p className="font-medium">
                        {Number(item.total_price).toFixed(2)} €
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Notes internes
                {!isEditingNotes && (
                  <Button variant="ghost" size="sm" onClick={handleEditNotes}>
                    {order.internal_notes ? 'Modifier' : 'Ajouter'}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Ajouter des notes internes..."
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Enregistrer
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsEditingNotes(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : order.internal_notes ? (
                <p className="text-sm whitespace-pre-wrap">{order.internal_notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune note</p>
              )}
            </CardContent>
          </Card>

          {/* Email Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Actions email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <SendShippingEmailButton
                  orderId={orderId}
                  orderItems={order.order_items || []}
                />
                <SendDeliveryEmailButton
                  orderId={orderId}
                  orderItems={order.order_items || []}
                />
                <SendCancellationEmailButton
                  orderId={orderId}
                  orderAmount={order.amount || 0}
                  orderItems={order.order_items || []}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud">
          <FraudAssessmentPanel orderId={orderId} />
        </TabsContent>

        <TabsContent value="history">
          <OrderHistoryTimeline orderId={orderId} />
        </TabsContent>

        <TabsContent value="anomalies">
          <OrderAnomaliesList orderId={orderId} showResolved />
        </TabsContent>
      </Tabs>
    </div>
  );
}
