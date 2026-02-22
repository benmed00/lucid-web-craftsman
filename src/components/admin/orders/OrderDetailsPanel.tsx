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
import { OrderCustomerTab } from './OrderCustomerTab';
import { OrderPaymentTab } from './OrderPaymentTab';
import { OrderCouponTab } from './OrderCouponTab';
import { OrderCommandPalette } from './OrderCommandPalette';
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
  Command,
  Tag,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Chrome,
  Receipt,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface OrderDetailsPanelProps {
  orderId: string;
  onClose?: () => void;
}

// Device icon helper
const getDeviceIcon = (deviceType: string) => {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
  const billingAddress = order.billing_address as Record<string, string> | null;
  const metadata = order.metadata as Record<string, unknown> | null;

  // Extract enriched metadata
  const deviceType = metadata?.device_type as string || 'Desktop';
  const browser = metadata?.browser as string || 'Unknown';
  const browserVersion = metadata?.browser_version as string || '';
  const os = metadata?.os as string || 'Unknown';
  const clientIp = metadata?.client_ip as string || 'Unknown';
  const orderCountry = metadata?.order_country as string || shippingAddress?.country || 'Unknown';
  const guestId = metadata?.guest_id as string || null;
  const discountCode = metadata?.discount_code as string || null;
  const discountAmount = metadata?.discount_amount as number || 0;

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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCommandPaletteOpen(true)}
            className="gap-1"
          >
            <Command className="h-3 w-3" />
            <span className="hidden sm:inline">Actions</span>
            <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
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

      {/* Command Palette */}
      <OrderCommandPalette
        orderId={orderId}
        currentStatus={order.order_status as OrderStatus}
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onActionComplete={() => refetch()}
      />

      <Separator />

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-1">
            <User className="h-3 w-3" />
            Client
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            Paiement
          </TabsTrigger>
          <TabsTrigger value="coupon" className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Promo
          </TabsTrigger>
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
            {/* Customer Info with enhanced data */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  {/* Name from shipping address */}
                  {(shippingAddress?.first_name || billingAddress?.first_name) && (
                    <p className="font-medium text-base">
                      {shippingAddress?.first_name || billingAddress?.first_name}{' '}
                      {shippingAddress?.last_name || billingAddress?.last_name}
                    </p>
                  )}
                  
                  {/* Email */}
                  {(shippingAddress?.email || billingAddress?.email) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{shippingAddress?.email || billingAddress?.email}</span>
                    </div>
                  )}
                  
                  {/* Phone */}
                  {(shippingAddress?.phone || billingAddress?.phone) && (
                    <p className="text-muted-foreground">
                      📞 {shippingAddress?.phone || billingAddress?.phone}
                    </p>
                  )}
                  
                  <Separator className="my-2" />
                  
                  {/* User ID or Guest ID */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">ID:</span>
                    {order.user_id ? (
                      <Link 
                        to={`/admin/customers?id=${order.user_id}`}
                        className="text-primary hover:underline font-mono text-xs"
                      >
                        {order.user_id.slice(0, 8)}
                      </Link>
                    ) : guestId ? (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {guestId}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Invité</Badge>
                    )}
                  </div>

                  {/* Device Info */}
                  <div className="flex items-center gap-2 mt-2">
                    {getDeviceIcon(deviceType)}
                    <span className="text-muted-foreground">
                      {deviceType} • {browser} {browserVersion && `v${browserVersion}`}
                    </span>
                  </div>

                  {/* OS */}
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">{os}</span>
                  </div>

                  {/* IP Address */}
                  {clientIp && clientIp !== 'Unknown' && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground font-mono text-xs">{clientIp}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Info with coupon */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <p className="font-bold text-lg">
                    {((order.amount || 0) / 100).toFixed(2)} {order.currency?.toUpperCase()}
                  </p>
                  <p className="text-muted-foreground">
                    {order.payment_method || 'Non spécifié'}
                  </p>
                  {order.payment_reference && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Réf: {order.payment_reference.slice(0, 24)}...
                    </p>
                  )}
                  
                  {/* Coupon/Promo Code Display */}
                  {discountCode && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700 dark:text-green-300">
                          Code: {discountCode}
                        </span>
                      </div>
                      {discountAmount > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Remise: -{discountAmount.toFixed(2)} €
                        </p>
                      )}
                    </div>
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

            {/* Shipping Address - Enhanced */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shippingAddress && (shippingAddress.address_line1 || shippingAddress.city) ? (
                  <div className="text-sm space-y-1">
                    {shippingAddress.first_name && (
                      <p className="font-medium">
                        {shippingAddress.first_name} {shippingAddress.last_name}
                      </p>
                    )}
                    <p>{shippingAddress.address_line1}</p>
                    {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                    <p>
                      {shippingAddress.postal_code} {shippingAddress.city}
                      {shippingAddress.state && `, ${shippingAddress.state}`}
                    </p>
                    <p className="font-medium">
                      {getCountryName(shippingAddress.country)}
                    </p>
                    {shippingAddress.phone && (
                      <p className="text-muted-foreground mt-2">📞 {shippingAddress.phone}</p>
                    )}
                    {shippingAddress.email && (
                      <p className="text-muted-foreground">✉️ {shippingAddress.email}</p>
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

          {/* Order Items - Clickable */}
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
                  const productImage = (snapshot?.images as string[])?.[0] || (snapshot?.image_url as string);
                  
                  return (
                    <div key={item.id} className="py-3 flex items-center gap-4">
                      {/* Product Image or Placeholder */}
                      <Link 
                        to={`/products/${item.product_id}`}
                        className="h-14 w-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden hover:ring-2 ring-primary transition-all"
                      >
                        {productImage ? (
                          <img 
                            src={productImage} 
                            alt={snapshot?.name as string || 'Produit'} 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-muted-foreground" />
                        )}
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        {/* Clickable Product Name */}
                        <Link 
                          to={`/products/${item.product_id}`}
                          className="font-medium truncate hover:text-primary hover:underline transition-colors block"
                        >
                          {snapshot?.name as string || 'Produit'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          Qté: {item.quantity} × {Number(item.unit_price).toFixed(2)} €
                        </p>
                        {snapshot?.sku && (
                          <p className="text-xs text-muted-foreground font-mono">
                            SKU: {snapshot.sku as string}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="font-medium">
                          {Number(item.total_price).toFixed(2)} €
                        </p>
                        {/* Quick view button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="h-6 px-2 text-xs"
                        >
                          <Link to={`/products/${item.product_id}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            Voir
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Order Summary */}
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>
                    {(order.order_items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0).toFixed(2)} €
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Remise ({discountCode})
                    </span>
                    <span>-{discountAmount.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>
                    {((order.amount || 0) / 100 - (order.order_items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0) + discountAmount) > 0 
                      ? `${(((order.amount || 0) / 100 - (order.order_items?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0) + discountAmount)).toFixed(2)} €`
                      : 'Gratuite'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{((order.amount || 0) / 100).toFixed(2)} €</span>
                </div>
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

        <TabsContent value="customer">
          <OrderCustomerTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="payment">
          <OrderPaymentTab orderId={orderId} />
        </TabsContent>

        <TabsContent value="coupon">
          <OrderCouponTab orderId={orderId} />
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

// Helper function to get country name from code
function getCountryName(code: string | undefined): string {
  const countries: Record<string, string> = {
    'FR': 'France',
    'BE': 'Belgique',
    'CH': 'Suisse',
    'LU': 'Luxembourg',
    'MC': 'Monaco',
    'DE': 'Allemagne',
    'ES': 'Espagne',
    'IT': 'Italie',
    'GB': 'Royaume-Uni',
    'US': 'États-Unis',
    'CA': 'Canada',
  };
  return countries[code || ''] || code || 'Inconnu';
}
