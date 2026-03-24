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

type ConfirmationState = 'loading' | 'success' | 'processing' | 'error';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire', paypal: 'PayPal',
  sepa_debit: 'Prélèvement SEPA', bank_transfer: 'Virement bancaire',
};

const OrderConfirmation = () => {
  const { t } = useTranslation(['pages', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const isPayPal = searchParams.get('paypal') === 'true';

  const [state, setState] = useState<ConfirmationState>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const { clearCart } = useCart();
  const { user, profile } = useAuth();
  const initRef = useRef(false);

  // ================================================================
  // Fetch order by ID — single source of truth
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
        const snapshot = item.product_snapshot as any;
        return {
          product_name: snapshot?.name || 'Produit',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          image_url: snapshot?.images?.[0] || undefined,
        };
      });
    } catch {
      return [];
    }
  }, []);

  // Auto-redirect for authenticated users
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

  // ================================================================
  // Main verification flow
  // ================================================================
  useEffect(() => {
    localStorage.removeItem('checkout_payment_pending');
    if (initRef.current) return;
    initRef.current = true;

    if (!orderId) {
      setState('error');
      return;
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const verify = async () => {
      console.log('[OrderConfirmation] Looking up order', { order_id: orderId });

      // Step 1: Immediate lookup
      let orderData = await fetchOrder(orderId);

      if (!orderData) {
        // Order might not be visible yet — poll briefly
        for (let i = 0; i < 5; i++) {
          await sleep(2000);
          orderData = await fetchOrder(orderId);
          if (orderData) break;
        }
      }

      if (!orderData) {
        console.warn('[OrderConfirmation] Order not found after polling');
        setState('processing');
        clearCart();
        localStorage.removeItem('cart');
        return;
      }

      setOrder(orderData);

      // Fetch order items
      const items = await fetchOrderItems(orderId);
      setOrderItems(items);

      const isPaid = orderData.status === 'paid' || orderData.status === 'completed';

      if (isPaid) {
        console.log('[OrderConfirmation] Order confirmed', { order_id: orderId });
        setState('success');
        clearCart();
        localStorage.removeItem('cart');
        toast.success(t('pages:paymentSuccess.success.confirmed'));
        return;
      }

      // Order exists but not yet paid — poll for webhook
      for (let i = 0; i < 5; i++) {
        await sleep(2000);
        const updated = await fetchOrder(orderId);
        if (updated && (updated.status === 'paid' || updated.status === 'completed')) {
          setOrder(updated);
          setState('success');
          clearCart();
          localStorage.removeItem('cart');
          toast.success(t('pages:paymentSuccess.success.confirmed'));
          return;
        }
      }

      // Still pending — show reassuring processing state (never show error)
      console.log('[OrderConfirmation] Order still pending, showing processing state');
      setState('processing');
      clearCart();
      localStorage.removeItem('cart');
    };

    // Handle PayPal verification
    const verifyPayPal = async () => {
      const paypalToken = searchParams.get('token');
      if (!paypalToken || !orderId) {
        setState('error');
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke('verify-paypal-payment', {
          body: { paypal_order_id: paypalToken, order_id: orderId },
        });
        if (error || !data?.success) {
          setState('error');
          return;
        }
        const orderData = await fetchOrder(orderId);
        if (orderData) {
          setOrder(orderData);
          const items = await fetchOrderItems(orderId);
          setOrderItems(items);
        }
        setState('success');
        clearCart();
        localStorage.removeItem('cart');
        toast.success(t('pages:paymentSuccess.success.confirmed'));
      } catch {
        setState('error');
      }
    };

    if (isPayPal) {
      verifyPayPal();
    } else {
      verify();
    }
  }, [orderId, isPayPal, searchParams, fetchOrder, fetchOrderItems, clearCart, t]);

  // ================================================================
  // Invoice download
  // ================================================================
  const handleDownloadInvoice = useCallback(() => {
    if (!order || orderItems.length === 0) return;

    const formatPrice = (value: number) => (value / 100).toFixed(2) + ' €';
    const orderNumber = order.id.slice(-8).toUpperCase();
    const invoiceNumber = `${new Date().getFullYear()}-${orderNumber}`;
    const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR');
    const shippingAddr = order.shipping_address;
    const subtotal = orderItems.reduce((sum, i) => sum + i.total_price, 0);
    const total = order.amount;
    const shipping = Math.max(0, total - subtotal);

    const itemsHtml = orderItems.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.product_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatPrice(item.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatPrice(item.total_price)}</td>
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
<p>Sous-total : ${formatPrice(subtotal)}</p>
<p>Livraison : ${shipping > 0 ? formatPrice(shipping) : 'Offerte'}</p>
<p class="total">Total : ${formatPrice(total)}</p></div>
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

  const orderNumber = order?.id.slice(-8).toUpperCase() || '';
  const orderDate = order ? new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) : '';

  const shippingAddr = order?.shipping_address;
  const customerName = shippingAddr
    ? `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim()
    : profile?.full_name || '';
  const customerEmail = order?.metadata?.customer_email || user?.email || '';

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">

          {/* === LOADING STATE === */}
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

          {/* === SUCCESS STATE === */}
          {state === 'success' && order && (
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

              {/* Order details card */}
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
                {/* Header */}
                <div className="bg-muted/50 px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Commande #{orderNumber}</p>
                    <p className="text-xs text-muted-foreground">Date : {orderDate}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{orderDate}</span>
                </div>

                {/* Customer */}
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

                {/* Items */}
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

              {/* Status badge */}
              <div className="bg-muted/50 rounded-xl p-6 mb-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    Statut : En cours de traitement
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Votre commande est en cours de préparation.
                  Nous vous enverrons un autre email avec toutes les informations de suivi dès qu'elle sera expédiée.
                </p>
              </div>
            </>
          )}

          {/* === PROCESSING STATE (order not yet visible in DB) === */}
          {state === 'processing' && (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 text-primary mx-auto mb-4" />
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                Paiement en cours de traitement
              </h1>
              <p className="text-muted-foreground mb-4">
                Votre paiement a été reçu. Nous rencontrons un léger délai d'affichage,
                mais soyez assuré que tout est bien enregistré.
              </p>
              <div className="bg-muted/50 rounded-xl p-6 max-w-md mx-auto">
                <p className="text-sm text-muted-foreground">
                  Vous recevrez un email de confirmation sous quelques minutes.
                  Si vous ne recevez rien dans 15 minutes, contactez notre support.
                </p>
              </div>
            </div>
          )}

          {/* === ERROR STATE (no order_id at all) === */}
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
          {state !== 'loading' && (
            <div className="space-y-4">
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

                {state === 'success' && order && orderItems.length > 0 && (
                  <Button onClick={handleDownloadInvoice} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Télécharger la facture
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
