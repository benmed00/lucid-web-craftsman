import {
  CheckCircle,
  ShoppingBag,
  Home,
  Loader2,
  Mail,
  Download,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/stores';
import { useAuth } from '@/context/AuthContext';

// ================================================================
// Types
// ================================================================
interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string;
}

interface OrderData {
  id: string;
  status: string;
  order_status: string;
  amount: number;
  currency: string;
  created_at: string;
  shipping_address: any;
  metadata: any;
  customer_email?: string;
  customer_name?: string;
}

interface CheckoutSnapshot {
  email: string;
  customerName: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  timestamp: number;
}

type ConfirmationState = 'loading' | 'success' | 'processing' | 'fallback' | 'error';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

// ================================================================
// Helpers
// ================================================================
function loadSnapshot(): CheckoutSnapshot | null {
  try {
    const raw = localStorage.getItem('checkout_snapshot');
    if (!raw) return null;
    const data = JSON.parse(raw) as CheckoutSnapshot;
    // Expire after 1 hour
    if (Date.now() - data.timestamp > 3600_000) {
      localStorage.removeItem('checkout_snapshot');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

// ================================================================
// Sub-components
// ================================================================

/** STATE 1: Processing — shows immediately with snapshot data + visible timer */
function OrderProcessing({ snapshot, orderId, elapsed }: { snapshot: CheckoutSnapshot | null; orderId: string | null; elapsed: number }) {
  const maxSeconds = 30;
  const progress = Math.min((elapsed / maxSeconds) * 100, 100);

  return (
    <div className="text-center py-8">
      <div className="relative w-16 h-16 mx-auto mb-6">
        <CheckCircle className="w-16 h-16 text-primary" />
        <Loader2 className="w-6 h-6 text-primary absolute -bottom-1 -right-1 animate-spin" />
      </div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
        Paiement reçu ✓
      </h1>
      <p className="text-muted-foreground mb-4">
        Nous finalisons votre commande, veuillez patienter quelques instants…
      </p>

      {/* Progress bar */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Vérification en cours… {Math.min(elapsed, maxSeconds)}s / {maxSeconds}s
        </p>
      </div>

      {snapshot && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden max-w-md mx-auto text-left mb-6">
          <div className="bg-muted/50 px-6 py-3">
            <p className="text-sm font-medium text-foreground">Récapitulatif</p>
          </div>
          {snapshot.email && (
            <div className="px-6 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Email de confirmation</p>
              <p className="text-sm font-medium text-foreground">{snapshot.email}</p>
            </div>
          )}
          {snapshot.items.length > 0 && (
            <div className="px-6 py-3 border-t border-border space-y-2">
              {snapshot.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.name} × {item.quantity}</span>
                  <span className="text-foreground font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
          <div className="px-6 py-3 border-t border-border flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-semibold text-foreground">{snapshot.total.toFixed(2)} €</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** STATE 2: Success — full order data from DB */
function OrderSuccess({
  order, orderItems, customerName, customerEmail, formatPrice, onDownloadInvoice,
}: {
  order: OrderData;
  orderItems: OrderItem[];
  customerName: string;
  customerEmail: string;
  formatPrice: (cents: number) => string;
  onDownloadInvoice: () => void;
}) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
          Paiement confirmé
        </h1>
        <p className="text-lg text-foreground font-medium mb-1">
          Merci pour votre commande !
        </p>
        <p className="text-muted-foreground">
          Votre paiement a bien été reçu et votre commande est en cours de traitement.
          Un email de confirmation vous a été envoyé.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
        <div className="bg-muted/50 px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">Commande #{orderNumber}</p>
            <p className="text-xs text-muted-foreground">Date : {orderDate}</p>
          </div>
        </div>

        {(customerName || customerEmail) && (
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {customerName ? `Client, ${customerName}` : 'Client'}
              </span>
            </div>
            {customerEmail && (
              <p className="text-xs text-muted-foreground ml-6">{customerEmail}</p>
            )}
          </div>
        )}

        {orderItems.length > 0 && (
          <div className="px-6 py-4 border-t border-border">
            <p className="text-sm font-semibold text-foreground mb-3">Détails</p>
            <div className="space-y-3">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-12 h-12 rounded-lg object-cover border border-border"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Quantité : {item.quantity}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatPrice(item.total_price)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold text-foreground">{formatPrice(order.amount)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/50 rounded-xl p-6 mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Statut : En cours de traitement
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Votre commande est en cours de préparation.
          Nous vous enverrons un email avec les informations de suivi dès qu'elle sera expédiée.
        </p>
      </div>

      {orderItems.length > 0 && (
        <div className="flex justify-center mb-4">
          <Button onClick={onDownloadInvoice} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Télécharger la facture
          </Button>
        </div>
      )}
    </>
  );
}

/** STATE 3: Fallback — order not found after retries */
function OrderFallback({ snapshot, onRetry, isRetrying }: {
  snapshot: CheckoutSnapshot | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="text-center py-8">
      <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
        Votre commande est en cours de traitement
      </h1>
      <p className="text-muted-foreground mb-6">
        Votre paiement a bien été reçu. Le traitement de votre commande peut prendre
        quelques minutes. Vous recevrez un email de confirmation très prochainement.
      </p>

      {snapshot && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden max-w-md mx-auto text-left mb-6">
          <div className="bg-primary/10 px-6 py-3">
            <p className="text-sm font-medium text-foreground">✓ Paiement enregistré</p>
          </div>
          {snapshot.email && (
            <div className="px-6 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">Confirmation envoyée à</p>
              <p className="text-sm font-medium text-foreground">{snapshot.email}</p>
            </div>
          )}
          {snapshot.items.length > 0 && (
            <div className="px-6 py-3 border-t border-border space-y-2">
              {snapshot.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.name} × {item.quantity}</span>
                  <span className="text-foreground font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
          <div className="px-6 py-3 border-t border-border flex justify-between">
            <span className="font-semibold text-foreground">Total payé</span>
            <span className="font-semibold text-foreground">{snapshot.total.toFixed(2)} €</span>
          </div>
        </div>
      )}

      <div className="bg-muted/50 rounded-xl p-6 max-w-md mx-auto mb-6">
        <p className="text-sm text-muted-foreground">
          Si vous ne recevez pas d'email dans 15 minutes, n'hésitez pas à contacter notre support.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onRetry} disabled={isRetrying} variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Vérification…' : 'Vérifier à nouveau'}
        </Button>
        <Button asChild variant="secondary" className="gap-2">
          <Link to="/contact">
            <Mail className="w-4 h-4" />
            Contacter le support
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ================================================================
// Main page
// ================================================================
const OrderConfirmation = () => {
  const { t } = useTranslation(['pages', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const isPayPal = searchParams.get('paypal') === 'true';

  const [state, setState] = useState<ConfirmationState>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [snapshot] = useState<CheckoutSnapshot | null>(() => loadSnapshot());
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);
  const { clearCart } = useCart();
  const { user, profile } = useAuth();
  const initRef = useRef(false);

  // Clean up cart on mount
  useEffect(() => {
    localStorage.removeItem('checkout_payment_pending');
    clearCart();
    localStorage.removeItem('cart');
  }, [clearCart]);

  // Elapsed timer for processing state — auto-fallback after 35s safety net
  useEffect(() => {
    if (state !== 'processing') {
      setProcessingElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setProcessingElapsed((prev) => {
        const next = prev + 1;
        // Safety net: if still processing after 35s, force fallback
        if (next >= 35) {
          clearInterval(interval);
          console.warn('[OrderConfirmation] Processing timeout reached, forcing fallback');
          setState('fallback');
          return next;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  // Fetch helpers
  // ================================================================
  const fetchOrder = useCallback(async (oid: string): Promise<OrderData | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, order_status, amount, currency, created_at, shipping_address, metadata, payment_method, user_id')
        .eq('id', oid)
        .maybeSingle();
      if (error || !data) return null;
      return data as OrderData;
    } catch {
      return null;
    }
  }, []);

  const fetchOrderItems = useCallback(async (oid: string): Promise<OrderItem[]> => {
    try {
      const { data } = await supabase
        .from('order_items')
        .select('quantity, unit_price, total_price, product_snapshot')
        .eq('order_id', oid);
      return (data || []).map((item: any) => {
        const snap = item.product_snapshot as any;
        return {
          product_name: snap?.name || 'Produit',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          image_url: snap?.images?.[0] || undefined,
        };
      });
    } catch {
      return [];
    }
  }, []);

  // ================================================================
  // Polling with exponential backoff
  // ================================================================
  const pollForOrder = useCallback(async (oid: string): Promise<{ order: OrderData | null; items: OrderItem[] }> => {
    const delays = [1000, 1500, 2000, 2500, 3000, 3000, 3000, 3000, 3000, 3000]; // 10 retries

    for (let i = 0; i < delays.length; i++) {
      const orderData = await fetchOrder(oid);

      if (orderData) {
        const isPaid = orderData.status === 'paid' || orderData.status === 'completed';

        if (isPaid) {
          const items = await fetchOrderItems(oid);
          return { order: orderData, items };
        }

        // Order exists but not yet paid — keep polling for webhook
        if (i < delays.length - 1) {
          await new Promise((r) => setTimeout(r, delays[i]));
          continue;
        }

        // Last attempt — return what we have
        const items = await fetchOrderItems(oid);
        return { order: orderData, items };
      }

      // Order not found yet — wait and retry
      if (i < delays.length - 1) {
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }

    return { order: null, items: [] };
  }, [fetchOrder, fetchOrderItems]);

  // ================================================================
  // Reconcile via Edge Function (self-healing fallback)
  // ================================================================
  const reconcileOrder = useCallback(async (oid: string): Promise<boolean> => {
    try {
      console.log('[OrderConfirmation] Attempting reconciliation', { order_id: oid });
      const { data, error } = await supabase.functions.invoke('reconcile-payment', {
        body: { order_id: oid },
      });

      if (error) {
        console.warn('[OrderConfirmation] Reconciliation call failed', error);
        return false;
      }

      if (data?.success && (data?.reconciled || data?.status === 'paid')) {
        console.log('[OrderConfirmation] Reconciliation successful', data);
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[OrderConfirmation] Reconciliation error', err);
      return false;
    }
  }, []);

  // ================================================================
  // Main verification
  // ================================================================
  const runVerification = useCallback(async () => {
    if (!orderId) {
      setState('error');
      return;
    }

    console.log('[OrderConfirmation] Looking up order', { order_id: orderId });

    // Show processing state immediately (with snapshot data)
    if (state === 'loading') {
      setState('processing');
    }

    const { order: orderData, items } = await pollForOrder(orderId);

    if (!orderData) {
      // Order not found after polling — attempt self-healing reconciliation
      console.warn('[OrderConfirmation] Order not found after polling, attempting reconciliation');
      const reconciled = await reconcileOrder(orderId);

      if (reconciled) {
        // Re-fetch the now-confirmed order
        const reconciledOrder = await fetchOrder(orderId);
        if (reconciledOrder) {
          const reconciledItems = await fetchOrderItems(orderId);
          setOrder(reconciledOrder);
          setOrderItems(reconciledItems);
          setState('success');
          toast.success(t('pages:paymentSuccess.success.confirmed'));
          return;
        }
      }

      setState('fallback');
      return;
    }

    setOrder(orderData);
    setOrderItems(items);

    const isPaid = orderData.status === 'paid' || orderData.status === 'completed';
    if (isPaid) {
      setState('success');
      toast.success(t('pages:paymentSuccess.success.confirmed'));
    } else {
      // Order exists but still pending — show fallback with reassurance
      setState('fallback');
    }
  }, [orderId, pollForOrder, reconcileOrder, fetchOrder, fetchOrderItems, state, t]);

  // Initial verification
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (isPayPal) {
      const verifyPayPal = async () => {
        const paypalToken = searchParams.get('token');
        if (!paypalToken || !orderId) {
          setState('error');
          return;
        }
        setState('processing');
        try {
          const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
            body: { paypal_order_id: paypalToken, order_id: orderId },
          });
          if (error || !data?.success) {
            setState('fallback');
            return;
          }
          const orderData = await fetchOrder(orderId);
          if (orderData) {
            setOrder(orderData);
            const items = await fetchOrderItems(orderId);
            setOrderItems(items);
          }
          setState('success');
          toast.success(t('pages:paymentSuccess.success.confirmed'));
        } catch {
          setState('fallback');
        }
      };
      verifyPayPal();
    } else {
      runVerification();
    }
  }, [orderId, isPayPal, searchParams, fetchOrder, fetchOrderItems, runVerification, t]);

  // Retry handler for fallback state
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await runVerification();
    setIsRetrying(false);
  }, [runVerification]);

  // Auto-redirect for authenticated users on success
  useEffect(() => {
    if (!user || state !== 'success') return;
    setRedirectCountdown(8);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          navigate('/orders');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user, state, navigate]);

  // Clean up snapshot after successful confirmation
  useEffect(() => {
    if (state === 'success') {
      try { localStorage.removeItem('checkout_snapshot'); } catch { /* */ }
    }
  }, [state]);

  // ================================================================
  // Invoice download
  // ================================================================
  const handleDownloadInvoice = useCallback(() => {
    if (!order || orderItems.length === 0) return;
    const fmtPrice = (value: number) => (value / 100).toFixed(2) + ' €';
    const orderNumber = order.id.slice(-8).toUpperCase();
    const invoiceNumber = `${new Date().getFullYear()}-${orderNumber}`;
    const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR');
    const shippingAddr = order.shipping_address;
    const subtotal = orderItems.reduce((sum, i) => sum + i.total_price, 0);
    const total = order.amount;
    const shippingCalc = Math.max(0, total - subtotal);

    const itemsHtml = orderItems.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.product_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtPrice(item.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtPrice(item.total_price)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${invoiceNumber}</title>
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:40px;}
h1{color:#2d5016;font-size:24px;}table{width:100%;border-collapse:collapse;margin:20px 0;}
th{background:#2d5016;color:#fff;padding:10px;text-align:left;font-size:12px;text-transform:uppercase;}
.total{font-size:18px;font-weight:bold;color:#2d5016;}
@media print{body{padding:20px;}}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:start;">
<div><h1>Rif Raw Straw</h1><p style="color:#888;font-size:12px;">Artisanat Berbère Authentique</p></div>
<div style="text-align:right;"><h2 style="color:#2d5016;">FACTURE</h2><p>${invoiceNumber}</p><p>${orderDate}</p></div></div>
${shippingAddr ? `<div style="margin:20px 0;"><strong>Client</strong><br/>${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}<br/>${shippingAddr.address_line1 || ''}<br/>${shippingAddr.postal_code || ''} ${shippingAddr.city || ''}<br/>${COUNTRY_NAMES[shippingAddr.country] || shippingAddr.country || ''}</div>` : ''}
<table><thead><tr><th>Produit</th><th style="text-align:right;">Qté</th><th style="text-align:right;">P.U.</th><th style="text-align:right;">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
<div style="text-align:right;margin-top:20px;">
<p>Sous-total : ${fmtPrice(subtotal)}</p>
<p>Livraison : ${shippingCalc > 0 ? fmtPrice(shippingCalc) : 'Offerte'}</p>
<p class="total">Total : ${fmtPrice(total)}</p></div>
<p style="color:#888;font-size:11px;margin-top:40px;">TVA non applicable, art. 293 B du CGI. ID: ${order.id}</p>
<script>window.onload=function(){window.print();}</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [order, orderItems]);

  // ================================================================
  // Helpers
  // ================================================================
  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: order?.currency || 'EUR' })
      .format(cents / 100);

  const shippingAddr = order?.shipping_address;
  const customerName = shippingAddr
    ? `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim()
    : snapshot?.customerName || profile?.full_name || '';
  const customerEmail = order?.metadata?.customer_email || snapshot?.email || user?.email || '';

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">

          {/* === LOADING — very brief, transitions to processing instantly === */}
          {state === 'loading' && (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                {t('pages:paymentSuccess.verifying.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('pages:paymentSuccess.verifying.description')}
              </p>
            </div>
          )}

          {/* === PROCESSING — instant, shows snapshot data === */}
          {state === 'processing' && (
            <OrderProcessing snapshot={snapshot} orderId={orderId} elapsed={processingElapsed} />
          )}

          {/* === SUCCESS — full DB data === */}
          {state === 'success' && order && (
            <OrderSuccess
              order={order}
              orderItems={orderItems}
              customerName={customerName}
              customerEmail={customerEmail}
              formatPrice={formatPrice}
              onDownloadInvoice={handleDownloadInvoice}
            />
          )}

          {/* === FALLBACK — order not found after retries === */}
          {state === 'fallback' && (
            <OrderFallback
              snapshot={snapshot}
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          )}

          {/* === ERROR — no order_id at all === */}
          {state === 'error' && (
            <div className="text-center py-16">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                Session invalide
              </h1>
              <p className="text-muted-foreground mb-6">
                Aucun identifiant de commande n'a été trouvé. Si vous avez effectué un paiement,
                vérifiez votre email pour la confirmation.
              </p>
            </div>
          )}

          {/* === ACTION BUTTONS === */}
          {state !== 'loading' && state !== 'processing' && (
            <div className="space-y-4 mt-8">
              {user && state === 'success' && redirectCountdown !== null && (
                <p className="text-sm text-muted-foreground text-center">
                  Redirection vers vos commandes dans {redirectCountdown}s…{' '}
                  <button
                    onClick={() => setRedirectCountdown(null)}
                    className="underline text-primary hover:text-primary/80"
                  >
                    Annuler
                  </button>
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
                {user && state === 'success' && (
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/orders">
                      <Package className="w-5 h-5" />
                      Voir mes commandes
                    </Link>
                  </Button>
                )}

                <Button asChild variant="secondary" className="gap-2">
                  <Link to="/products">
                    <ShoppingBag className="w-4 h-4" />
                    {t('common:buttons.continueShopping')}
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="gap-2">
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    {t('common:buttons.backToHome')}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Help section */}
          <div className="mt-12 p-6 bg-primary/10 rounded-lg text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('pages:paymentSuccess.help.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('pages:paymentSuccess.help.description')}
            </p>
            <Button variant="outline" asChild>
              <Link to="/contact" className="flex items-center justify-center">
                <Mail className="w-4 h-4 mr-2" />
                {t('common:nav.contact')}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default OrderConfirmation;
