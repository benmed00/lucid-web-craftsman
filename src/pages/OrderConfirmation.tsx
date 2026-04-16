import {
  CheckCircle,
  ShoppingBag,
  Home,
  Loader2,
  Mail,
  Download,
  Package,
  AlertTriangle,
  RefreshCw,
  CreditCard,
  FileText,
  Truck,
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

// Single source of truth — always usable, never null on success
interface ResolvedOrder {
  id: string;
  status: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  email: string;
  customerName: string;
  shippingAddress: any | null;
  createdAt: string;
  paymentMethod?: string;
  isFromDB: boolean;
  isFallback: boolean;
}

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', BE: 'Belgique', CH: 'Suisse',
  ES: 'Espagne', IT: 'Italie', NL: 'Pays-Bas', GB: 'Royaume-Uni',
  US: 'États-Unis', CA: 'Canada', MA: 'Maroc',
};

/** Build a fully-resolved order from DB data, snapshot, or minimal fallback. NEVER returns null. */
function buildResolvedOrder(
  order: OrderData | null,
  orderItems: OrderItem[],
  snapshot: CheckoutSnapshot | null,
  orderId: string | null,
  authEmail: string,
  profileName: string
): ResolvedOrder {
  // Priority 1: DB data
  if (order) {
    const items = orderItems.map((it) => ({
      name: it.product_name,
      quantity: it.quantity,
      price: it.unit_price / 100,
      image: it.image_url,
    }));
    const subtotal = orderItems.reduce((s, i) => s + i.total_price, 0) / 100;
    const totalEuros = (order.amount || 0) / 100;
    const shippingCalc = Math.max(0, totalEuros - subtotal);
    const addr = order.shipping_address;
    const customerName = addr
      ? `${addr.first_name || ''} ${addr.last_name || ''}`.trim()
      : snapshot?.customerName || profileName || '';
    return {
      id: order.id,
      status: order.status || order.order_status || 'paid',
      items: items.length > 0 ? items : (snapshot?.items || []),
      subtotal: items.length > 0 ? subtotal : (snapshot?.subtotal || 0),
      shipping: items.length > 0 ? shippingCalc : (snapshot?.shipping || 0),
      discount: snapshot?.discount || 0,
      total: totalEuros || snapshot?.total || 0,
      currency: order.currency || snapshot?.currency || 'EUR',
      email: order.metadata?.customer_email || snapshot?.email || authEmail || 'N/A',
      customerName,
      shippingAddress: addr || null,
      createdAt: order.created_at,
      paymentMethod: 'Carte bancaire (Stripe)',
      isFromDB: true,
      isFallback: false,
    };
  }
  // Priority 2: Snapshot
  if (snapshot) {
    return {
      id: orderId || 'N/A',
      status: 'paid',
      items: snapshot.items || [],
      subtotal: snapshot.subtotal || 0,
      shipping: snapshot.shipping || 0,
      discount: snapshot.discount || 0,
      total: snapshot.total || 0,
      currency: snapshot.currency || 'EUR',
      email: snapshot.email || authEmail || 'N/A',
      customerName: snapshot.customerName || profileName || '',
      shippingAddress: null,
      createdAt: new Date(snapshot.timestamp || Date.now()).toISOString(),
      isFromDB: false,
      isFallback: false,
    };
  }
  // Priority 3: Minimal — never blank
  return {
    id: orderId || 'N/A',
    status: 'paid',
    items: [],
    subtotal: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    currency: 'EUR',
    email: authEmail || 'N/A',
    customerName: profileName || '',
    shippingAddress: null,
    createdAt: new Date().toISOString(),
    isFromDB: false,
    isFallback: true,
  };
}

// ================================================================
// Helpers
// ================================================================
function loadSnapshot(): CheckoutSnapshot | null {
  try {
    const raw = localStorage.getItem('checkout_snapshot');
    if (!raw) return null;
    const data = JSON.parse(raw) as CheckoutSnapshot;
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

/** Shared order summary card — used by success, processing, and fallback */
function OrderSummaryCard({
  items,
  email,
  customerName,
  total,
  subtotal,
  shipping,
  discount,
  orderNumber,
  orderDate,
  paymentMethod,
  isFromDB,
}: {
  items: { name: string; quantity: number; price: number; image?: string }[];
  email?: string;
  customerName?: string;
  total: number;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  orderNumber?: string;
  orderDate?: string;
  paymentMethod?: string;
  isFromDB?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden text-left">
      {/* Header */}
      {(orderNumber || orderDate) && (
        <div className="bg-muted/50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          {orderNumber && (
            <p className="text-sm font-semibold text-foreground">Commande #{orderNumber}</p>
          )}
          {orderDate && (
            <p className="text-xs text-muted-foreground">{orderDate}</p>
          )}
        </div>
      )}

      {/* Customer info */}
      {(customerName || email) && (
        <div className="px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">
              {customerName || 'Client'}
            </span>
          </div>
          {email && (
            <p className="text-xs text-muted-foreground ml-6">{email}</p>
          )}
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-3">Articles</p>
          <div className="space-y-3">
            {items.map((item, idx) => (
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
                  {(item.price * item.quantity).toFixed(2)} €
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="px-6 py-4 border-t border-border space-y-1">
        {subtotal !== undefined && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sous-total</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
        )}
        {discount !== undefined && discount > 0 && (
          <div className="flex justify-between text-sm text-primary">
            <span>Réduction</span>
            <span>-{discount.toFixed(2)} €</span>
          </div>
        )}
        {shipping !== undefined && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Livraison</span>
            <span>{shipping === 0 ? 'Offerte' : `${shipping.toFixed(2)} €`}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
          <span>Total payé</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      {/* Payment method */}
      {paymentMethod && (
        <div className="px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payé par {paymentMethod}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** STATE 1: Processing — brief, shows snapshot, max 5s before auto-transition */
function OrderProcessing({ snapshot }: { snapshot: CheckoutSnapshot | null }) {
  return (
    <div className="text-center py-8">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <CheckCircle className="w-20 h-20 text-primary" />
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      </div>

      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
        Paiement confirmé ✓
      </h1>
      <p className="text-muted-foreground mb-6">
        Votre commande est bien enregistrée. Chargement des détails…
      </p>

      {/* Brief loading bar */}
      <div className="max-w-xs mx-auto mb-8">
        <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
          <div className="bg-primary h-full rounded-full animate-pulse w-3/4" />
        </div>
      </div>

      {snapshot && (
        <div className="max-w-md mx-auto">
          <OrderSummaryCard
            items={snapshot.items}
            email={snapshot.email}
            customerName={snapshot.customerName}
            total={snapshot.total}
            subtotal={snapshot.subtotal}
            shipping={snapshot.shipping}
            discount={snapshot.discount}
          />
        </div>
      )}
    </div>
  );
}

/** STATE 2: Success — full order data from DB */
function OrderSuccess({
  order,
  orderItems,
  customerName,
  customerEmail,
  onDownloadInvoice,
}: {
  order: OrderData;
  orderItems: OrderItem[];
  customerName: string;
  customerEmail: string;
  onDownloadInvoice: () => void;
}) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const totalEuros = order.amount / 100;

  const items = orderItems.map((item) => ({
    name: item.product_name,
    quantity: item.quantity,
    price: item.unit_price / 100,
    image: item.image_url,
  }));

  const subtotal = orderItems.reduce((s, i) => s + i.total_price, 0) / 100;
  const shippingCalc = Math.max(0, totalEuros - subtotal);

  return (
    <>
      {/* Hero success banner */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
          Paiement confirmé ✓
        </h1>
        <p className="text-lg text-foreground font-medium mb-1">
          Votre commande a bien été enregistrée
        </p>
        <p className="text-muted-foreground text-sm">
          Un email de confirmation a été envoyé à{' '}
          <span className="font-medium text-foreground">{customerEmail || 'votre adresse'}</span>
        </p>
      </div>

      {/* Order summary */}
      <div className="mb-6">
        <OrderSummaryCard
          items={items}
          email={customerEmail}
          customerName={customerName}
          total={totalEuros}
          subtotal={subtotal}
          shipping={shippingCalc}
          orderNumber={orderNumber}
          orderDate={orderDate}
          paymentMethod="Carte bancaire (Stripe)"
          isFromDB
        />
      </div>

      {/* Shipping address */}
      {order.shipping_address && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Truck className="w-4 h-4" />
            Adresse de livraison
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
            {order.shipping_address.address_line1}<br />
            {order.shipping_address.postal_code} {order.shipping_address.city}<br />
            {COUNTRY_NAMES[order.shipping_address.country] || order.shipping_address.country}
          </p>
        </div>
      )}

      {/* Invoice CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
        <Button onClick={onDownloadInvoice} className="gap-2" size="lg">
          <FileText className="w-5 h-5" />
          📄 Télécharger ma facture (PDF)
        </Button>
        <Button onClick={onDownloadInvoice} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Voir la facture en ligne
        </Button>
      </div>

      {/* Next steps */}
      <div className="bg-primary/5 rounded-xl border border-primary/20 p-6 mb-6">
        <p className="text-sm font-semibold text-foreground mb-3">Prochaines étapes</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <span className="text-lg leading-none">📦</span>
            <div>
              <p className="font-medium text-foreground">Préparation</p>
              <p className="text-muted-foreground text-xs">Nos artisans préparent votre commande avec soin</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-lg leading-none">🚚</span>
            <div>
              <p className="font-medium text-foreground">Expédition</p>
              <p className="text-muted-foreground text-xs">Vous recevrez un email avec le numéro de suivi</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <span className="text-lg leading-none">🎁</span>
            <div>
              <p className="font-medium text-foreground">Livraison</p>
              <p className="text-muted-foreground text-xs">Profitez de vos produits artisanaux !</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** STATE 3: Fallback — reassuring, shows snapshot data */
function OrderFallback({ snapshot, onRetry, isRetrying }: {
  snapshot: CheckoutSnapshot | null;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle className="w-12 h-12 text-primary" />
      </div>
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
        Votre commande est bien enregistrée ✓
      </h1>
      <p className="text-muted-foreground mb-6">
        Votre paiement a été reçu avec succès. Le traitement peut prendre quelques instants.
        <br />Vous recevrez un email de confirmation très prochainement.
      </p>

      {snapshot && (
        <div className="max-w-md mx-auto mb-6">
          <OrderSummaryCard
            items={snapshot.items}
            email={snapshot.email}
            customerName={snapshot.customerName}
            total={snapshot.total}
            subtotal={snapshot.subtotal}
            shipping={snapshot.shipping}
            discount={snapshot.discount}
          />
        </div>
      )}

      {!snapshot && (
        <div className="bg-muted/50 rounded-xl p-6 max-w-md mx-auto mb-6">
          <p className="text-sm text-muted-foreground">
            Votre commande est bien enregistrée. Vous recevrez un email de confirmation sous peu.
          </p>
        </div>
      )}

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
  const { clearCart } = useCart();
  const { user, profile } = useAuth();
  const initRef = useRef(false);
  const verificationActiveRef = useRef(false);

  // Clean up cart on mount
  useEffect(() => {
    localStorage.removeItem('checkout_payment_pending');
    clearCart();
    localStorage.removeItem('cart');
  }, [clearCart]);

  // (safety timeout effect moved below after reconcile/finalize declarations)

  // Fetch helpers
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

  // Polling — shorter, 3 retries max
  const pollForOrder = useCallback(async (oid: string): Promise<{ order: OrderData | null; items: OrderItem[] }> => {
    const delays = [800, 1200, 1500];

    for (let i = 0; i < delays.length; i++) {
      const orderData = await fetchOrder(oid);
      if (orderData) {
        const isPaid = orderData.status === 'paid' || orderData.status === 'completed';
        if (isPaid) {
          const items = await fetchOrderItems(oid);
          return { order: orderData, items };
        }
        if (i < delays.length - 1) {
          await new Promise((r) => setTimeout(r, delays[i]));
          continue;
        }
        const items = await fetchOrderItems(oid);
        return { order: orderData, items };
      }
      if (i < delays.length - 1) {
        await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
    return { order: null, items: [] };
  }, [fetchOrder, fetchOrderItems]);

  // Reconcile via Edge Function — returns response data for immediate use
  const reconcileOrder = useCallback(async (oid: string): Promise<{ success: boolean; data?: any }> => {
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-payment', {
        body: { order_id: oid },
      });
      if (error) return { success: false };
      // Trust edge function: it returns success:true when paid or already confirmed.
      // Don't gate on the `reconciled` flag (idempotent path returns reconciled:false).
      const isSuccess = !!data?.success || data?.status === 'paid';
      return { success: isSuccess, data };
    } catch {
      return { success: false };
    }
  }, []);

  // Helper: after reconcile succeeds, fetch DB data and go to success
  const finalizeFromReconcile = useCallback(async (oid: string): Promise<boolean> => {
    const ro = await fetchOrder(oid);
    if (ro) {
      const ri = await fetchOrderItems(oid);
      setOrder(ro);
      setOrderItems(ri);
      setState('success');
      return true;
    }
    return false;
  }, [fetchOrder, fetchOrderItems]);

  // Safety net: 8s ceiling. If verification still active, trigger one final
  // reconcile attempt instead of jumping to fallback (no infinite spinner).
  useEffect(() => {
    if (state !== 'processing') return;
    const timer = setTimeout(async () => {
      if (!verificationActiveRef.current) {
        console.warn('[OrderConfirmation] Safety timeout — verification idle, forcing fallback');
        setState('fallback');
        return;
      }
      if (!orderId) {
        setState('fallback');
        return;
      }
      console.warn('[OrderConfirmation] Safety timeout — last reconcile attempt');
      try {
        const result = await reconcileOrder(orderId);
        if (result.success || result.data?.status === 'paid') {
          const fetched = await finalizeFromReconcile(orderId);
          if (!fetched) setState('success');
        } else {
          setState('fallback');
        }
      } catch {
        setState('fallback');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [state, orderId, reconcileOrder, finalizeFromReconcile]);

  // Main verification
  const runVerification = useCallback(async () => {
    if (!orderId) {
      setState('error');
      return;
    }

    verificationActiveRef.current = true;

    // Show processing immediately
    if (state === 'loading') {
      setState('processing');
    }

    try {
      // Step 1: Quick poll — check if order is already paid in DB
      const { order: orderData, items } = await pollForOrder(orderId);

      if (!orderData) {
        // Order not found in DB — try reconcile
        const result = await reconcileOrder(orderId);
        if (result.success || result.data?.status === 'paid') {
          const fetched = await finalizeFromReconcile(orderId);
          if (!fetched) {
            // Build synthetic order so success UI is never blank
            const synthetic: OrderData = {
              id: orderId,
              status: 'paid',
              order_status: 'paid',
              amount: snapshot?.total ?? 0,
              currency: 'EUR',
              created_at: new Date().toISOString(),
              shipping_address: null,
              metadata: { customer_email: snapshot?.email || user?.email || '' },
            };
            setOrder(synthetic);
            setOrderItems([]);
            setState('success');
          }
          return;
        }
        setState('fallback');
        return;
      }

      // Step 2: Order found — check if already paid
      const isPaid = orderData.status === 'paid' || orderData.status === 'completed'
        || orderData.order_status === 'paid' || orderData.order_status === 'completed';

      if (isPaid) {
        setOrder(orderData);
        setOrderItems(items);
        setState('success');
        return;
      }

      // Step 3: Order exists but not yet paid — reconcile
      const result = await reconcileOrder(orderId);
      if (result.success || result.data?.status === 'paid') {
        // Reconcile says paid — trust it immediately
        // Try one DB fetch for fresh data, but don't block on it
        const ro = await fetchOrder(orderId);
        if (ro) {
          const ri = await fetchOrderItems(orderId);
          setOrder(ro);
          setOrderItems(ri);
        } else {
          // Use the order we already polled, just mark as paid
          setOrder({ ...orderData, status: 'paid' });
          setOrderItems(items);
        }
        setState('success');
        return;
      }

      // Reconcile didn't confirm paid — show what we have as fallback
      setOrder(orderData);
      setOrderItems(items);
      setState('fallback');
    } finally {
      verificationActiveRef.current = false;
    }
  }, [orderId, pollForOrder, reconcileOrder, finalizeFromReconcile, fetchOrder, fetchOrderItems, state]);

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
        } catch {
          setState('fallback');
        }
      };
      verifyPayPal();
    } else {
      runVerification();
    }
  }, [orderId, isPayPal, searchParams, fetchOrder, fetchOrderItems, runVerification]);

  // Retry handler
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setState('processing');
    initRef.current = false;
    await runVerification();
    setIsRetrying(false);
  }, [runVerification]);

  // Auto-redirect for authenticated users
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

  // Clean up snapshot after success
  useEffect(() => {
    if (state === 'success') {
      try { localStorage.removeItem('checkout_snapshot'); } catch { /* */ }
    }
  }, [state]);

  // Build single source of truth — never null, always renderable
  const resolvedOrder = useMemo<ResolvedOrder>(() => {
    const ro = buildResolvedOrder(
      order,
      orderItems,
      snapshot,
      orderId,
      user?.email || '',
      profile?.full_name || ''
    );
    if (ro.isFallback) {
      console.warn('[OrderConfirmation] Using minimal fallback order', {
        hasOrder: !!order,
        hasSnapshot: !!snapshot,
        orderId,
      });
    }
    return ro;
  }, [order, orderItems, snapshot, orderId, user?.email, profile?.full_name]);

  // Invoice download — works from resolvedOrder, never blocked
  const handleDownloadInvoice = useCallback(() => {
    const ro = resolvedOrder;
    const orderNumber = ro.id.slice(-8).toUpperCase();
    const invoiceNumber = `${new Date().getFullYear()}-${orderNumber}`;
    const orderDate = new Date(ro.createdAt).toLocaleDateString('fr-FR');
    const addr = ro.shippingAddress;
    const fmt = (n: number) => n.toFixed(2) + ' €';

    const itemsHtml = ro.items.length > 0
      ? ro.items.map((item) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.price)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(item.price * item.quantity)}</td>
        </tr>`).join('')
      : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#888;">Détails non disponibles — voir email de confirmation</td></tr>`;

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${invoiceNumber}</title>
<style>body{font-family:system-ui,sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:40px;}
h1{color:#2d5016;font-size:24px;}table{width:100%;border-collapse:collapse;margin:20px 0;}
th{background:#2d5016;color:#fff;padding:10px;text-align:left;font-size:12px;text-transform:uppercase;}
.total{font-size:18px;font-weight:bold;color:#2d5016;}
@media print{body{padding:20px;}}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:start;">
<div><h1>Rif Raw Straw</h1><p style="color:#888;font-size:12px;">Artisanat Berbère Authentique</p></div>
<div style="text-align:right;"><h2 style="color:#2d5016;">FACTURE</h2><p>${invoiceNumber}</p><p>${orderDate}</p></div></div>
${addr ? `<div style="margin:20px 0;"><strong>Client</strong><br/>${addr.first_name || ''} ${addr.last_name || ''}<br/>${addr.address_line1 || ''}<br/>${addr.postal_code || ''} ${addr.city || ''}<br/>${COUNTRY_NAMES[addr.country] || addr.country || ''}</div>` : (ro.customerName ? `<div style="margin:20px 0;"><strong>Client</strong><br/>${ro.customerName}<br/>${ro.email}</div>` : `<div style="margin:20px 0;"><strong>Client</strong><br/>${ro.email}</div>`)}
<table><thead><tr><th>Produit</th><th style="text-align:right;">Qté</th><th style="text-align:right;">P.U.</th><th style="text-align:right;">Total</th></tr></thead>
<tbody>${itemsHtml}</tbody></table>
<div style="text-align:right;margin-top:20px;">
${ro.subtotal > 0 ? `<p>Sous-total : ${fmt(ro.subtotal)}</p>` : ''}
${ro.discount > 0 ? `<p>Réduction : -${fmt(ro.discount)}</p>` : ''}
${ro.shipping >= 0 && ro.subtotal > 0 ? `<p>Livraison : ${ro.shipping > 0 ? fmt(ro.shipping) : 'Offerte'}</p>` : ''}
<p class="total">Total : ${fmt(ro.total)}</p></div>
<p style="color:#888;font-size:11px;margin-top:40px;">TVA non applicable, art. 293 B du CGI. ID: ${ro.id}</p>
<script>window.onload=function(){window.print();}</script></body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [resolvedOrder]);

  // Convenience aliases (used by existing render code)
  const customerName = resolvedOrder.customerName;
  const customerEmail = resolvedOrder.email;

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">

          {/* LOADING — very brief, transitions to processing instantly */}
          {state === 'loading' && (
            <div className="text-center py-16">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Chargement…</p>
            </div>
          )}

          {/* PROCESSING — instant reassurance with snapshot */}
          {state === 'processing' && (
            <OrderProcessing snapshot={snapshot} />
          )}

          {/* SUCCESS — full DB data or snapshot fallback */}
          {state === 'success' && order && (
            <OrderSuccess
              order={order}
              orderItems={orderItems}
              customerName={customerName}
              customerEmail={customerEmail}
              onDownloadInvoice={handleDownloadInvoice}
            />
          )}
          {state === 'success' && !order && snapshot && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">Paiement confirmé ✓</h1>
              <p className="text-lg text-foreground font-medium mb-1">Votre commande a bien été enregistrée</p>
              <p className="text-muted-foreground text-sm mb-6">Un email de confirmation vous sera envoyé sous peu.</p>
              <div className="max-w-md mx-auto">
                <OrderSummaryCard
                  items={snapshot.items}
                  email={snapshot.email}
                  customerName={snapshot.customerName}
                  total={snapshot.total}
                  subtotal={snapshot.subtotal}
                  shipping={snapshot.shipping}
                  discount={snapshot.discount}
                />
              </div>
            </div>
          )}
          {/* SUCCESS — minimal fallback when no order and no snapshot */}
          {state === 'success' && !order && !snapshot && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">Paiement confirmé ✓</h1>
              <p className="text-lg text-foreground font-medium mb-1">Votre commande a bien été enregistrée</p>
              <p className="text-muted-foreground text-sm mb-4">
                Un email de confirmation vous sera envoyé sous peu.
              </p>
              {orderId && (
                <p className="text-sm text-muted-foreground">
                  N° de commande : <span className="font-mono text-foreground">{orderId.slice(-8).toUpperCase()}</span>
                </p>
              )}
              {(user?.email || customerEmail) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Email : <span className="text-foreground">{user?.email || customerEmail}</span>
                </p>
              )}
            </div>
          )}

          {state === 'fallback' && (
            <OrderFallback
              snapshot={snapshot}
              onRetry={handleRetry}
              isRetrying={isRetrying}
            />
          )}

          {/* ERROR — no order_id */}
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

          {/* ACTION BUTTONS */}
          {(state === 'success' || state === 'fallback' || state === 'error') && (
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
