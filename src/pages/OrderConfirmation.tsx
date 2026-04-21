import {
  CheckCircle,
  ShoppingBag,
  Home,
  Loader2,
  Mail,
  Download,
  Package,
  AlertTriangle,
  CreditCard,
  FileText,
  Truck,
  ShieldCheck,
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
import {
  downloadInvoice as downloadInvoiceShared,
  requestOrderToken,
  fetchOrderByToken,
  type OrderByTokenResponse,
} from '@/lib/invoice/generateInvoice';

// ================================================================
// Types
// ================================================================
type OrderRow = OrderByTokenResponse['order'];
type ItemRow = OrderByTokenResponse['items'][number];
type ConfirmationState = 'loading' | 'processing' | 'success' | 'error';

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

interface NormalizedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

function normalizeItems(items: ItemRow[]): NormalizedItem[] {
  return items.map((it) => {
    const snap = (it.product_snapshot ?? {}) as { name?: string; images?: string[] };
    return {
      name: snap.name || 'Produit',
      quantity: it.quantity,
      unitPrice: Number(it.unit_price) || 0,
      totalPrice: Number(it.total_price) || 0,
      image: snap.images?.[0],
    };
  });
}

// ================================================================
// Sub-components
// ================================================================

function OrderSuccess({
  order,
  items,
  onDownloadInvoice,
}: {
  order: OrderRow;
  items: ItemRow[];
  onDownloadInvoice: () => void;
}) {
  const { user } = useAuth();
  const normalized = normalizeItems(items);
  const totalEuros = Number(order.amount) || 0;
  const subtotal = normalized.reduce((s, i) => s + i.totalPrice, 0);
  const shippingCalc = Math.max(0, totalEuros - subtotal);

  const orderNumber = order.id.slice(-8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const customerEmail =
    (order.metadata as any)?.customer_email ||
    (order.shipping_address as any)?.email ||
    '';
  const addr = order.shipping_address as any;
  const customerName = addr ? `${addr.first_name || ''} ${addr.last_name || ''}`.trim() : '';

  // Diagnostics — should never log CRITICAL when state === 'success'.
  console.log('[OrderConfirmation] ORDER', order);
  console.log('[OrderConfirmation] ITEMS', items);

  return (
    <>
      <div className="bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl shadow-lg p-8 md:p-10 text-center mb-8 animate-scale-in">
        <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-primary/20 flex items-center justify-center ring-8 ring-primary/5">
          <CheckCircle className="w-14 h-14 text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
          Paiement confirmé
        </h1>
        <p className="text-base md:text-lg text-foreground/90 font-medium mb-2">
          Votre commande a bien été enregistrée
        </p>
        <p className="text-muted-foreground text-sm">
          Un email de confirmation a été envoyé à{' '}
          <span className="font-medium text-foreground">{customerEmail || 'votre adresse'}</span>
        </p>
      </div>

      {/* CTAs */}
      <div className="bg-card rounded-2xl border border-border shadow-md p-6 mb-6 animate-fade-in">
        <p className="text-sm font-semibold text-foreground mb-4 text-center">
          Que souhaitez-vous faire ?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button onClick={onDownloadInvoice} className="gap-2" size="lg">
            <FileText className="w-5 h-5" />
            Télécharger la facture
          </Button>
          {user ? (
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/orders">
                <Package className="w-5 h-5" />
                Voir mes commandes
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to={`/invoice/${order.id}`}>
                <Download className="w-5 h-5" />
                Page facture
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="lg" className="gap-2">
            <Link to="/products">
              <ShoppingBag className="w-5 h-5" />
              Continuer mes achats
            </Link>
          </Button>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden text-left mb-6 animate-fade-in">
        <div className="bg-muted/50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <p className="text-sm font-semibold text-foreground">Commande #{orderNumber}</p>
          <p className="text-xs text-muted-foreground">{orderDate}</p>
        </div>

        {(customerName || customerEmail) && (
          <div className="px-6 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{customerName || 'Client'}</span>
            </div>
            {customerEmail && (
              <p className="text-xs text-muted-foreground ml-6">{customerEmail}</p>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-3">Articles</p>
          <div className="space-y-3">
            {normalized.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border border-border"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Quantité : {item.quantity}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {(item.unitPrice * item.quantity).toFixed(2)} €
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sous-total</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Livraison</span>
            <span>{shippingCalc === 0 ? 'Offerte' : `${shippingCalc.toFixed(2)} €`}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>Total payé</span>
            <span>{totalEuros.toFixed(2)} €</span>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payé par {(order.metadata as any)?.payment_method_label || 'Carte bancaire'}</span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Truck className="w-4 h-4" />
            Adresse de livraison
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {addr.first_name} {addr.last_name}<br />
            {addr.address_line1}<br />
            {addr.postal_code} {addr.city}<br />
            {COUNTRY_NAMES[addr.country] || addr.country}
          </p>
        </div>
      )}

      {/* Trust */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">Paiement sécurisé</p>
            <p className="text-[11px] text-muted-foreground">via Stripe</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Truck className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">Suivi à venir</p>
            <p className="text-[11px] text-muted-foreground">par email</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Mail className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">Support</p>
            <a href="mailto:contact@rifrawstraw.com" className="text-[11px] text-primary underline">
              contact@rifrawstraw.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function OrderError({ reason }: { reason: string }) {
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
      </div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
        Impossible d'afficher la commande
      </h1>
      <p className="text-muted-foreground mb-2">
        Nous n'avons pas pu charger les détails de cette commande.
      </p>
      <p className="text-muted-foreground text-sm mb-6">
        Si vous avez été débité, contactez le support — votre paiement est protégé.
      </p>
      <p className="text-xs text-muted-foreground/70 mb-6 font-mono">{reason}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="gap-2">
          <a href="mailto:contact@rifrawstraw.com">
            <Mail className="w-4 h-4" />
            Contacter le support
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            Retour à l'accueil
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
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [errorReason, setErrorReason] = useState<string>('');
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const { clearCart } = useCart();
  const { user } = useAuth();
  const initRef = useRef(false);

  // Clean up cart on mount
  useEffect(() => {
    localStorage.removeItem('checkout_payment_pending');
    clearCart();
    localStorage.removeItem('cart');
  }, [clearCart]);

  // Strict token-based load with bounded retry (handles payment-confirmation lag).
  const loadOrder = useCallback(async (oid: string) => {
    setState('processing');
    const DELAYS = [500, 1000, 2000];
    const MAX_ATTEMPTS = DELAYS.length + 1; // 4 total attempts

    const logFail = (step: string, reason: string, extra: Record<string, unknown> = {}) => {
      console.error('[OrderConfirmation] CRITICAL', { order_id: oid, step, reason, ...extra });
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const token = await requestOrderToken(oid);
        const { order: o, items: its } = await fetchOrderByToken(token);

        const amount = Number(o?.amount) || 0;
        const empty = !o || amount <= 0 || !its || its.length === 0;

        if (!empty) {
          setOrder(o);
          setItems(its);
          setState('success');
          return;
        }

        // Retryable: data not yet consistent (webhook still landing).
        if (attempt < MAX_ATTEMPTS - 1) {
          console.warn('[OrderConfirmation] retry', {
            order_id: oid, step: 'load', attempt: attempt + 1, amount, items: its?.length ?? 0,
          });
          await new Promise((r) => setTimeout(r, DELAYS[attempt]));
          continue;
        }

        logFail('validate', 'empty_after_retries', { amount, items: its?.length ?? 0 });
        setErrorReason(amount <= 0 ? `Invalid amount (${amount})` : 'No items found');
        setState('error');
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        // 409 from sign-order-token = not yet paid → retry. Other errors also retried (network blips).
        if (attempt < MAX_ATTEMPTS - 1) {
          console.warn('[OrderConfirmation] retry', {
            order_id: oid, step: 'fetch', attempt: attempt + 1, reason: msg,
          });
          await new Promise((r) => setTimeout(r, DELAYS[attempt]));
          continue;
        }
        logFail('fetch', msg);
        setErrorReason(msg);
        setState('error');
        return;
      }
    }
  }, []);

  // Initial verification
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    if (!orderId) {
      setErrorReason('Missing order_id in URL');
      setState('error');
      return;
    }

    const run = async () => {
      try {
        if (isPayPal) {
          const paypalToken = searchParams.get('token');
          if (!paypalToken) {
            setErrorReason('Missing PayPal token');
            setState('error');
            return;
          }
          setState('processing');
          await supabase.functions.invoke('verify-paypal-payment', {
            body: { paypal_order_id: paypalToken, order_id: orderId },
          });
        } else {
          // Stripe path: fire-and-forget reconcile to flip status server-side.
          setState('processing');
          await supabase.functions
            .invoke('reconcile-payment', { body: { order_id: orderId } })
            .catch(() => { /* ignore — get-order-by-token will surface truth */ });
        }
        await loadOrder(orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verification failed';
        console.error('[OrderConfirmation] CRITICAL', { reason: msg });
        setErrorReason(msg);
        setState('error');
      }
    };
    run();
  }, [orderId, isPayPal, searchParams, loadOrder]);

  // Auto-redirect for authenticated users after success
  useEffect(() => {
    if (!user || state !== 'success') return;
    setRedirectCountdown(10);
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

  // Invoice download
  const handleDownloadInvoice = useCallback(async () => {
    if (!orderId) {
      toast.error('Identifiant de commande manquant.');
      return;
    }
    try {
      await downloadInvoiceShared(orderId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Facture indisponible.';
      toast.error(msg, {
        description: "Vous pouvez aussi y accéder depuis l'email de confirmation.",
      });
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">

          {(state === 'loading' || state === 'processing') && (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <CheckCircle className="w-20 h-20 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                Paiement confirmé ✓
              </h1>
              <p className="text-muted-foreground">
                Chargement des détails de votre commande…
              </p>
            </div>
          )}

          {state === 'success' && order && (
            <OrderSuccess
              order={order}
              items={items}
              onDownloadInvoice={handleDownloadInvoice}
            />
          )}

          {state === 'error' && <OrderError reason={errorReason} />}

          {state === 'success' && user && redirectCountdown !== null && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Redirection vers vos commandes dans {redirectCountdown}s…{' '}
              <button
                onClick={() => setRedirectCountdown(null)}
                className="underline text-primary hover:text-primary/80"
              >
                Annuler
              </button>
            </p>
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
