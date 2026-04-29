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
import {
  Link,
  useSearchParams,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { toast } from 'sonner';
import {
  invokeVerifyPaypalPayment,
  invokeReconcilePayment,
} from '@/services/supabaseFunctionsApi';
import { useCart } from '@/stores';
import { useAuth } from '@/context/AuthContext';
import {
  downloadInvoice as downloadInvoiceShared,
  requestOrderToken,
  fetchOrderByToken,
  type OrderByTokenResponse,
} from '@/lib/invoice/generateInvoice';
import {
  pricingSnapshotV1Schema,
  type PricingSnapshotV1,
  fallbackTotalMinorFromOrder,
} from '@/lib/checkout/pricingSnapshot';
import { resolveCustomerEmail } from '@/lib/checkout/customerEmail';
import { looksLikeOrderUuid } from '@/lib/checkout/orderUuid';

// ================================================================
// Types
// ================================================================
type OrderRow = OrderByTokenResponse['order'];
type ItemRow = OrderByTokenResponse['items'][number];
// No 'processing' state: only loading until sign-order-token+get-order-by-token complete (avoids mixed UI phases)
type ConfirmationState = 'loading' | 'success' | 'error';

function regionDisplayName(
  regionCode: string | undefined,
  locale: string
): string {
  if (!regionCode) return '';
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(regionCode) ??
      regionCode
    );
  } catch {
    return regionCode;
  }
}

interface NormalizedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
}

function normalizeItems(items: ItemRow[]): NormalizedItem[] {
  return items.map((it) => {
    const snap = (it.product_snapshot ?? {}) as {
      name?: string;
      images?: string[];
    };
    return {
      name: (snap.name ?? '').trim(), // no fake "Produit" label; isOrderPayloadValid enforces real names
      quantity: it.quantity,
      unitPrice: Number(it.unit_price) || 0, // coerced for display; invalid rows are rejected before success
      totalPrice: Number(it.total_price) || 0,
      image: snap.images?.[0], // optional thumbnail from product_snapshot
    };
  });
}

// Renamed from legacy "snapshot" wording: pricing_v1 = Stripe JSON; order_amount = DB columns from same token response
interface ResolvedTotals {
  source: 'pricing_v1' | 'order_amount';
  currency: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
}

/**
 * Display totals: prefer `pricing_snapshot` (Stripe, minor units) when valid;
 * otherwise `orders.total_amount` then legacy `orders.amount` (minor units), then line items.
 */
function resolveTotals(
  order: OrderRow,
  items: NormalizedItem[]
): ResolvedTotals {
  const parsed = pricingSnapshotV1Schema.safeParse(order.pricing_snapshot); // authoritative when webhook wrote v1
  if (parsed.success) {
    const row: PricingSnapshotV1 = parsed.data;
    return {
      source: 'pricing_v1',
      currency: row.currency.toUpperCase(), // display
      total: row.total_minor / 100, // minor → major units
      subtotal: row.subtotal_minor / 100,
      shipping: row.shipping_minor / 100,
      discount: row.discount_minor / 100,
    };
  }
  const minorTotal = fallbackTotalMinorFromOrder(order);
  const totalEuro = minorTotal / 100;
  const subtotalMinor = items.reduce((s, i) => s + i.totalPrice, 0);
  const subtotalEuro = subtotalMinor / 100;
  return {
    source: 'order_amount',
    currency: (order.currency || 'EUR').toUpperCase(),
    total: totalEuro,
    subtotal: subtotalEuro,
    shipping: Math.max(0, totalEuro - subtotalEuro),
    discount: 0,
  };
}

// Hard gate: never render success with 0€ / empty lines / missing labels (replaces “minimal fallback” behavior)
function isOrderPayloadValid(order: OrderRow, items: ItemRow[]): boolean {
  if (!order || !items || items.length === 0) return false; // empty RLS or race → error state, not success

  const linesHaveName = items.every((it) => {
    const snap = (it.product_snapshot ?? {}) as { name?: string };
    return typeof snap.name === 'string' && snap.name.trim().length > 0; // every line must be displayable
  });
  if (!linesHaveName) return false;

  const snapParsed = pricingSnapshotV1Schema.safeParse(order.pricing_snapshot);
  if (snapParsed.success) {
    return snapParsed.data.total_minor > 0; // Stripe snapshot must show a positive total
  }
  return fallbackTotalMinorFromOrder(order) > 0;
}

// ================================================================
// Sub-components
// ================================================================

function OrderSuccess({
  order,
  items,
  orderAccessToken, // same HMAC as sign-order-token success; /invoice?token=… avoids guest_id on generate-invoice
  onDownloadInvoice,
}: {
  order: OrderRow;
  items: ItemRow[];
  orderAccessToken: string; // 15m order_access token, kept for links + optional invoice re-open
  onDownloadInvoice: () => void;
}) {
  const { t, i18n } = useTranslation('pages');
  const { user } = useAuth();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const normalized = normalizeItems(items);
  const totals = resolveTotals(order, normalized);
  const totalEuros = totals.total;
  const subtotal = totals.subtotal;
  const shippingCalc = totals.shipping;
  const discount = totals.discount;
  const currencySymbol = totals.currency === 'EUR' ? '€' : totals.currency;

  const orderNumber = order.id.slice(-8).toUpperCase();
  const orderDate = new Date(order.created_at).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const customerEmail = resolveCustomerEmail({
    metadata: order.metadata as Record<string, unknown> | null,
    shipping_address: order.shipping_address as Record<string, unknown> | null,
  });
  const addr = order.shipping_address as
    | {
        first_name?: string;
        last_name?: string;
        email?: string;
        address_line1?: string;
        postal_code?: string;
        city?: string;
        country?: string;
      }
    | null
    | undefined;
  const customerName = addr
    ? `${addr.first_name || ''} ${addr.last_name || ''}`.trim()
    : '';
  const paymentLabel = (
    order.metadata as { payment_method_label?: string } | null
  )?.payment_method_label;

  return (
    <>
      <div className="bg-gradient-to-b from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl shadow-lg p-8 md:p-10 text-center mb-8 animate-scale-in">
        <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-primary/20 flex items-center justify-center ring-8 ring-primary/5">
          <CheckCircle className="w-14 h-14 text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
          {t('paymentSuccess.orderConfirmation.successHeadline')}
        </h1>
        <p className="text-base md:text-lg text-foreground/90 font-medium mb-2">
          {t('paymentSuccess.orderConfirmation.successSubline')}
        </p>
        {customerEmail ? (
          <p className="text-muted-foreground text-sm">
            {t('paymentSuccess.orderConfirmation.emailTo', {
              email: customerEmail,
            })}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {t('paymentSuccess.orderConfirmation.emailGeneric')}
          </p>
        )}
      </div>

      {/* CTAs */}
      <div className="bg-card rounded-2xl border border-border shadow-md p-6 mb-6 animate-fade-in">
        <p className="text-sm font-semibold text-foreground mb-4 text-center">
          {t('paymentSuccess.orderConfirmation.ctaTitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button onClick={onDownloadInvoice} className="gap-2" size="lg">
            <FileText className="w-5 h-5" />
            {t('paymentSuccess.invoice.download')}
          </Button>
          {user ? (
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/orders">
                <Package className="w-5 h-5" />
                {t('paymentSuccess.orderConfirmation.viewOrders')}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link
                to={`/invoice/${order.id}?token=${encodeURIComponent(orderAccessToken)}`} // guest invoice: token auth, not x-guest-id
              >
                <Download className="w-5 h-5" />
                {t('paymentSuccess.orderConfirmation.guestInvoiceLink')}
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="lg" className="gap-2">
            <Link to="/products">
              <ShoppingBag className="w-5 h-5" />
              {t('paymentSuccess.orderConfirmation.continueShopping')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden text-left mb-6 animate-fade-in">
        <div className="bg-muted/50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
          <p className="text-sm font-semibold text-foreground">
            {t('paymentSuccess.orderConfirmation.orderHeading', {
              shortId: orderNumber,
            })}
          </p>
          <p className="text-xs text-muted-foreground">{orderDate}</p>
        </div>

        {(customerName || customerEmail) && (
          <div className="px-6 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              {customerName ? (
                <span className="font-medium text-foreground">
                  {customerName} {/* no static "Client" placeholder */}
                </span>
              ) : null}
            </div>
            {customerEmail && (
              <p className="text-xs text-muted-foreground ml-6">
                {customerEmail}
              </p>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-3">
            {t('paymentSuccess.orderConfirmation.itemsTitle')}
          </p>
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
                    <p className="text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('paymentSuccess.orderConfirmation.quantityLine', {
                        count: item.quantity,
                      })}
                    </p>
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
            <span>{t('paymentSuccess.invoice.subtotal')}</span>
            <span>
              {subtotal.toFixed(2)} {currencySymbol}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>{t('paymentSuccess.invoice.discount')}</span>
              <span>
                -{discount.toFixed(2)} {currencySymbol}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('paymentSuccess.invoice.shipping')}</span>
            <span>
              {shippingCalc === 0
                ? t('paymentSuccess.invoice.freeShipping')
                : `${shippingCalc.toFixed(2)} ${currencySymbol}`}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>{t('paymentSuccess.orderConfirmation.totalPaid')}</span>
            <span>
              {totalEuros.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </div>

        {/* No default "Carte bancaire" when label missing — avoids implying a method we did not read from DB */}
        {paymentLabel && (
          <div className="px-6 py-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>
                {t('paymentSuccess.orderConfirmation.paidWith', {
                  method: paymentLabel,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Truck className="w-4 h-4" />
            {t('paymentSuccess.orderConfirmation.shippingAddress')}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {addr.first_name} {addr.last_name}
            <br />
            {addr.address_line1}
            <br />
            {addr.postal_code} {addr.city}
            <br />
            {regionDisplayName(addr.country, locale)}
          </p>
        </div>
      )}

      {/* Trust */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">
              {t('paymentSuccess.orderConfirmation.trustPaymentSecure')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('paymentSuccess.orderConfirmation.trustStripe')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Truck className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">
              {t('paymentSuccess.orderConfirmation.trustTrackingTitle')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('paymentSuccess.orderConfirmation.trustTrackingHint')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Mail className="w-6 h-6 text-primary" />
            <p className="text-xs font-medium text-foreground">
              {t('paymentSuccess.orderConfirmation.trustSupport')}
            </p>
            <a
              href="mailto:contact@rifrawstraw.com"
              className="text-[11px] text-primary underline"
            >
              contact@rifrawstraw.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

const SUPPORT_EMAIL = 'contact@rifrawstraw.com'; // single CTA per product copy; no technical error string in UI

function OrderError() {
  const { t } = useTranslation('pages');
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive" />
      </div>
      {/* Hard error copy: no dev reason string, no “retry with fake data” path */}
      <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
        {t('paymentSuccess.orderConfirmation.errorTitle')}
      </h1>
      <p className="text-muted-foreground mb-6">
        {t('paymentSuccess.orderConfirmation.errorBody')}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="gap-2">
          <a href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail className="w-4 h-4" />
            {SUPPORT_EMAIL} {/* label = address so the CTA is unambiguous */}
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            {t('paymentSuccess.orderConfirmation.homeLink')}
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
  const { orderReference } = useParams<{ orderReference?: string }>();
  // Canonical `?order_id=` wins; else legacy path param from `/order-confirmation/:orderReference`
  const orderId = useMemo(() => {
    const q = searchParams.get('order_id')?.trim() ?? '';
    if (q && looksLikeOrderUuid(q)) return q;
    const p = orderReference?.trim() ?? '';
    if (p && looksLikeOrderUuid(p)) return p;
    return null;
  }, [searchParams, orderReference]);

  // Path-only links skip OrderConfirmationEntry (payment_return / canonicalize). Replace URL so one route owns the page.
  const needsCanonicalRedirect = useMemo(() => {
    const q = searchParams.get('order_id')?.trim() ?? '';
    if (q && looksLikeOrderUuid(q)) return false;
    const p = orderReference?.trim() ?? '';
    return Boolean(p && looksLikeOrderUuid(p));
  }, [searchParams, orderReference]);

  const isPayPal = searchParams.get('paypal') === 'true';

  useEffect(() => {
    if (!needsCanonicalRedirect || !orderReference) return;
    const next = new URLSearchParams(searchParams);
    next.set('order_id', orderReference.trim());
    const s = next.toString();
    navigate(
      { pathname: '/order-confirmation', search: s ? `?${s}` : '' },
      { replace: true }
    );
  }, [needsCanonicalRedirect, orderReference, searchParams, navigate]);

  const [state, setState] = useState<ConfirmationState>('loading'); // only loading|success|error: no “processing” retry phase
  const [order, setOrder] = useState<OrderRow | null>(null); // set only from get-order-by-token (no Supabase .from in this page)
  const [items, setItems] = useState<ItemRow[]>([]); // same source as order (token response)
  const [orderAccessToken, setOrderAccessToken] = useState<string | null>(null); // HMAC for invoice tab + download; avoids re-minting when possible
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null
  );
  const { clearCart } = useCart();
  const { user } = useAuth();

  // Dedupes StrictMode’s double effect; still re-runs when order id or PayPal return query changes
  const preflightRunKey = useMemo(
    () =>
      `${orderId ?? ''}|${String(needsCanonicalRedirect)}|${isPayPal}|${searchParams.get('token') ?? ''}`,
    [orderId, needsCanonicalRedirect, isPayPal, searchParams]
  );
  const lastPreflightKey = useRef<string>('');

  useEffect(() => {
    clearCart(); // clear persisted cart via store only — removed direct localStorage writes to avoid split-brain with checkout keys
  }, [clearCart]);

  // Single pass: no polling/retry (409/network used to mask race; we fail fast to error UI)
  const loadOrder = useCallback(async (oid: string) => {
    setState('loading');
    try {
      const token = await requestOrderToken(oid); // sign-order-token (server checks paid, mints 15m HMAC)
      const { order: o, items: its } = await fetchOrderByToken(token); // sole read path — never anon REST on orders/order_items

      if (!isOrderPayloadValid(o, its)) {
        console.error('[OrderConfirmation][CRITICAL]', {
          order_id: oid,
          order: o,
          items: its,
          fallback_minor: o ? fallbackTotalMinorFromOrder(o) : null,
          item_count: its?.length ?? 0,
        });
        setState('error');
        return;
      }

      setOrder(o);
      setItems(its);
      setOrderAccessToken(token); // keep for /invoice?token= and downloadInvoice without second sign
      setState('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[OrderConfirmation] token flow failed', {
        order_id: oid,
        msg,
      });
      setState('error'); // any sign/get failure → same hard error UI (no “minimal” fake order)
    }
  }, []);

  useEffect(() => {
    if (needsCanonicalRedirect) return; // wait for replace navigation; remount under `/order-confirmation?order_id=`

    if (!orderId) {
      lastPreflightKey.current = '';
      setState('error'); // no valid UUID in ?order_id= or /:orderReference — cannot call sign-order-token
      return;
    }

    if (lastPreflightKey.current === preflightRunKey) return;
    lastPreflightKey.current = preflightRunKey;

    const run = async () => {
      try {
        if (isPayPal) {
          const paypalToken = searchParams.get('token');
          if (!paypalToken) {
            setState('error');
            return;
          }
          await invokeVerifyPaypalPayment({
            paypal_order_id: paypalToken,
            order_id: orderId,
          }); // sync PayPal capture with our order before we mint token
        } else {
          // Best-effort Stripe session reconcile; loadOrder’s token read is still source of truth
          await invokeReconcilePayment({ order_id: orderId }).catch((err) => {
            console.warn('[OrderConfirmation] reconcile-payment failed', err);
          });
        }
        await loadOrder(orderId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verification failed';
        console.error('[OrderConfirmation] preflight failed', { reason: msg });
        setState('error');
      }
    };
    void run();
  }, [
    preflightRunKey,
    needsCanonicalRedirect,
    orderId,
    isPayPal,
    searchParams,
    loadOrder,
  ]);

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

  const handleDownloadInvoice = useCallback(async () => {
    if (!orderId) {
      toast.error(t('paymentSuccess.orderConfirmation.toastOrderIdMissing'));
      return;
    }
    try {
      // Reuse minted HMAC if present; else one more sign — generate-invoice never uses x-guest-id
      const invToken = orderAccessToken ?? (await requestOrderToken(orderId));
      await downloadInvoiceShared(orderId, invToken);
    } catch {
      toast.error(t('paymentSuccess.orderConfirmation.toastInvoiceError'), {
        description: t(
          'paymentSuccess.orderConfirmation.toastInvoiceEmailHint'
        ),
      });
    }
  }, [orderId, orderAccessToken, t]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-2xl mx-auto">
          {state === 'loading' && (
            <div className="text-center py-16">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <CheckCircle className="w-20 h-20 text-primary" />
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              </div>
              <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-2">
                {t('paymentSuccess.orderConfirmation.loadingTitle')}
              </h1>
              <p className="text-muted-foreground">
                {t('paymentSuccess.orderConfirmation.loadingSubtitle')}
              </p>
            </div>
          )}

          {/* Guard orderAccessToken so we never link to /invoice without a signed string */}
          {state === 'success' && order && orderAccessToken && (
            <OrderSuccess
              order={order}
              items={items}
              orderAccessToken={orderAccessToken}
              onDownloadInvoice={handleDownloadInvoice}
            />
          )}

          {state === 'error' && <OrderError />}

          {state === 'success' && user && redirectCountdown !== null && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              {t('paymentSuccess.ui.redirectOrders', {
                count: redirectCountdown,
              })}{' '}
              {/* type=button: avoid implicit submit if this block is ever moved inside a <form> */}
              <button
                type="button"
                onClick={() => setRedirectCountdown(null)}
                className="underline text-primary hover:text-primary/80"
              >
                {t('paymentSuccess.ui.cancelRedirect')}
              </button>
            </p>
          )}

          {/* Help section */}
          <div className="mt-12 p-6 bg-primary/10 rounded-lg text-center">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('paymentSuccess.help.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('paymentSuccess.help.description')}
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
