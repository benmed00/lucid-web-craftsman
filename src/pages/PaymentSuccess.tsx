import {
  CheckCircle,
  ShoppingBag,
  Home,
  Loader2,
  Mail,
  Download,
  Package,
  AlertTriangle,
} from 'lucide-react';
import {
  Link,
  useSearchParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import PageFooter from '@/components/PageFooter';
import { toast } from 'sonner';
import {
  invokeOrderLookup,
  invokeStripeSessionDisplay,
  invokeVerifyPaypalPayment,
} from '@/services/checkoutApi';
import { useCart } from '@/stores';
import { useAuth } from '@/context/AuthContext';
import { disableServiceWorkerForCriticalFlow } from '@/utils/cacheOptimization';
import { getPaymentSuccessPollDelays } from '@/lib/checkout/paymentPollingConfig';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  country: string;
}

interface InvoiceData {
  orderId: string;
  date: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: ShippingAddress | null;
  paymentMethod: string;
  currency: string;
  stripeSessionId: string;
}

interface OrderLookupResult {
  found: boolean;
  order_id?: string;
  status?: string;
  is_paid?: boolean;
  webhook_processed?: boolean;
  amount?: number;
  currency?: string;
}

interface StripeSessionSummary {
  customer_email?: string | null;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  items?: Array<{
    name: string;
    quantity: number;
    total: number;
  }>;
}

type VerificationState = 'success' | 'processing' | 'delayed' | 'issue';

const PAYMENT_RESULT_CACHE_KEY = 'payment_success_cached_result';
const PAYMENT_RESULT_CACHE_TTL_MS = 30 * 60 * 1000;

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  DE: 'Allemagne',
  BE: 'Belgique',
  CH: 'Suisse',
  ES: 'Espagne',
  IT: 'Italie',
  NL: 'Pays-Bas',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  CA: 'Canada',
  MA: 'Maroc',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Carte bancaire',
  paypal: 'PayPal',
  sepa_debit: 'Prélèvement SEPA',
  bank_transfer: 'Virement bancaire',
};

const PaymentSuccess = () => {
  const { t } = useTranslation(['pages', 'common']);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname: paymentReturnPath } = useLocation();
  const sessionId = searchParams.get('session_id');
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalOrderId = searchParams.get('token');
  const orderId = searchParams.get('order_id');

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    state: VerificationState;
    message: string;
    orderId?: string;
    transactionId?: string;
  } | null>(null);
  const [stripeSummary, setStripeSummary] =
    useState<StripeSessionSummary | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null
  );
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const { clearCart } = useCart();
  const { user, profile } = useAuth();
  const verificationRunRef = useRef(false);

  // Build invoice data from verify-paypal-payment (or similar) invoice payload
  const buildInvoiceFromResponse = useCallback(
    (responseInvoice: any, fetchedOrderId: string, customer: CustomerInfo) => {
      if (!responseInvoice?.items) return;
      setInvoiceData({
        orderId: fetchedOrderId,
        date: new Date(responseInvoice.date || Date.now()).toLocaleDateString(
          'fr-FR'
        ),
        customer,
        items: responseInvoice.items,
        subtotal: responseInvoice.subtotal || 0,
        shipping: responseInvoice.shipping || 0,
        discount: 0,
        total: responseInvoice.total || 0,
        shippingAddress: responseInvoice.shippingAddress || null,
        paymentMethod: responseInvoice.paymentMethod || 'card',
        currency: responseInvoice.currency || 'EUR',
        stripeSessionId: responseInvoice.stripeSessionId || '',
      });
    },
    []
  );

  // Auto-redirect to orders after successful payment (authenticated users)
  useEffect(() => {
    if (!user || verificationResult?.state !== 'success' || isVerifying) return;

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
  }, [user, verificationResult?.state, isVerifying, navigate]);

  useEffect(() => {
    disableServiceWorkerForCriticalFlow().catch(() => {
      /* non-blocking */
    });

    // Clear checkout processing flag
    localStorage.removeItem('checkout_payment_pending');

    // Prevent duplicate runs from re-renders
    if (verificationRunRef.current) return;
    verificationRunRef.current = true;

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const stripSensitiveParams = () => {
      const nextParams = new URLSearchParams(searchParams);
      let changed = false;
      ['session_id', 'token', 'paypal', 'order_id'].forEach((param) => {
        if (nextParams.has(param)) {
          nextParams.delete(param);
          changed = true;
        }
      });
      if (!changed) return;
      const nextSearch = nextParams.toString();
      navigate(
        {
          pathname: paymentReturnPath || '/order-confirmation',
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    };

    const getCustomerInfo = (): CustomerInfo => {
      const nameParts = (profile?.full_name || '').split(' ');
      return {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user?.email || '',
      };
    };

    const persistResultCache = (
      payload: {
        state: VerificationState;
        message: string;
        orderId?: string;
        transactionId?: string;
      },
      summary: StripeSessionSummary | null = null,
      customer: CustomerInfo | null = null
    ) => {
      try {
        localStorage.setItem(
          PAYMENT_RESULT_CACHE_KEY,
          JSON.stringify({
            createdAt: Date.now(),
            verificationResult: payload,
            stripeSummary: summary,
            customerInfo: customer,
          })
        );
      } catch {
        // ignore storage errors
      }
    };

    const readResultCache = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      const isReload = navigationEntry?.type === 'reload';
      if (!isReload) {
        return null;
      }
      try {
        const raw = localStorage.getItem(PAYMENT_RESULT_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as {
          createdAt?: number;
          verificationResult?: {
            state: VerificationState;
            message: string;
            orderId?: string;
            transactionId?: string;
          };
          stripeSummary?: StripeSessionSummary | null;
          customerInfo?: CustomerInfo | null;
        };
        if (!parsed?.createdAt || !parsed?.verificationResult) return null;
        if (Date.now() - parsed.createdAt > PAYMENT_RESULT_CACHE_TTL_MS) {
          localStorage.removeItem(PAYMENT_RESULT_CACHE_KEY);
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    };

    const clearCheckoutStateAfterPayment = () => {
      setCustomerInfo(getCustomerInfo());
      clearCart();
      localStorage.removeItem('cart');
      stripSensitiveParams();
    };

    const setSuccess = (oid: string, message?: string) => {
      const resolved = {
        state: 'success',
        message: message || t('pages:paymentSuccess.success.verified'),
        orderId: oid,
        transactionId: sessionId
          ? sessionId.slice(-8).toUpperCase()
          : undefined,
      } as const;
      setVerificationResult(resolved);
      setStripeSummary(null);
      const customer = getCustomerInfo();
      persistResultCache(resolved, null, customer);
      clearCheckoutStateAfterPayment();
      toast.success(t('pages:paymentSuccess.success.confirmed'));
    };

    const setProcessing = (
      message: string,
      orderIdValue?: string,
      summary: StripeSessionSummary | null = null
    ) => {
      const resolved = {
        state: 'processing',
        message,
        orderId: orderIdValue,
        transactionId: sessionId
          ? sessionId.slice(-8).toUpperCase()
          : undefined,
      } as const;
      setVerificationResult(resolved);
      setStripeSummary(summary);
      persistResultCache(resolved, summary, getCustomerInfo());
      clearCheckoutStateAfterPayment();
    };

    /** Long tail: webhook / DB slower than polls — never imply payment failure. */
    const setDelayed = (
      message: string,
      orderIdValue?: string,
      summary: StripeSessionSummary | null = null
    ) => {
      const resolved = {
        state: 'delayed',
        message,
        orderId: orderIdValue,
        transactionId: sessionId
          ? sessionId.slice(-8).toUpperCase()
          : undefined,
      } as const;
      setVerificationResult(resolved);
      setStripeSummary(summary);
      persistResultCache(resolved, summary, getCustomerInfo());
      clearCheckoutStateAfterPayment();
    };

    const setIssue = (message: string) => {
      setStripeSummary(null);
      const resolved = {
        state: 'issue',
        message,
      } as const;
      setVerificationResult(resolved);
      persistResultCache(resolved, null, getCustomerInfo());
      stripSensitiveParams();
    };

    // ================================================================
    // STEP 1: Lightweight DB lookup by stripe_session_id
    // ================================================================
    const lookupOrder = async (sid: string): Promise<OrderLookupResult> => {
      try {
        const { data, error } = await invokeOrderLookup(sid);
        if (error || !data) return { found: false };
        return data as OrderLookupResult;
      } catch {
        return { found: false };
      }
    };

    // ================================================================
    // STEP 2: Poll for pending order becoming paid (see paymentPollingConfig)
    // ================================================================
    const pollUntilPaid = async (
      sid: string,
      delays: number[]
    ): Promise<OrderLookupResult> => {
      const n = delays.length;
      for (let i = 0; i < n; i++) {
        setProcessingMessage(`Traitement en cours… (${i + 1}/${n})`);
        await sleep(delays[i]!);
        const result = await lookupOrder(sid);
        if (result.found && result.is_paid) return result;
      }
      return lookupOrder(sid);
    };

    // ================================================================
    // Stripe display-only snapshot (no DB / no order status inference)
    // ================================================================
    const fetchStripeSessionDisplay = async (
      sid: string
    ): Promise<StripeSessionSummary | null> => {
      try {
        const { data, error } = await invokeStripeSessionDisplay(sid);
        const row = data as Record<string, unknown>;
        if (error || !data || row.ok !== true) return null;
        return {
          customer_email:
            (row.customer_email as string | null | undefined) ?? null,
          amount_total: row.amount_total as number | undefined,
          currency: row.currency as string | undefined,
          payment_status: row.payment_status as string | undefined,
          items: Array.isArray(row.items) ? row.items : [],
        };
      } catch {
        return null;
      }
    };

    // ================================================================
    // MAIN FLOW: Deterministic order confirmation
    // ================================================================
    const verifyStripePayment = async (sid: string) => {
      const pollDelays = getPaymentSuccessPollDelays();
      const pollWaitBudgetMs = pollDelays.reduce((a, b) => a + b, 0);
      console.log(
        '[PaymentSuccess] stripe_return',
        JSON.stringify({
          session_id: sid,
          poll_steps: pollDelays.length,
          poll_wait_budget_ms: pollWaitBudgetMs,
        })
      );

      // Step 1: Immediate DB lookup
      const initial = await lookupOrder(sid);

      if (initial.found && initial.is_paid) {
        // Order already confirmed — instant success
        console.log('[PaymentSuccess] Order already paid in DB', {
          order_id: initial.order_id,
        });
        setSuccess(initial.order_id!);
        setIsVerifying(false);
        return;
      }

      if (initial.found && !initial.is_paid) {
        // Order exists but pending — webhook hasn't fired yet, poll
        console.log('[PaymentSuccess] Order pending, polling...', {
          order_id: initial.order_id,
        });
        setProcessingMessage('Votre paiement est en cours de validation…');
        const polled = await pollUntilPaid(sid, pollDelays);

        if (polled.found && polled.is_paid) {
          console.log('[PaymentSuccess] Order confirmed after polling');
          setSuccess(polled.order_id!);
          setIsVerifying(false);
          return;
        }

        setProcessing(
          'Votre paiement a ete recu. Votre commande est en cours de finalisation.',
          polled.order_id || initial.order_id
        );
        setIsVerifying(false);
        return;
      }

      // Step 3: No order found yet — wait a bit more for webhook propagation
      setProcessingMessage('Synchronisation de votre commande…');
      const delayedCheck = await pollUntilPaid(sid, pollDelays);
      if (delayedCheck.found && delayedCheck.is_paid) {
        setSuccess(delayedCheck.order_id!);
        setIsVerifying(false);
        return;
      }

      // Step 4: Stripe display-only (paid session → reassuring processing + receipt hints)
      const stripeDisplay = await fetchStripeSessionDisplay(sid);
      if (stripeDisplay?.payment_status === 'paid') {
        setProcessing(
          t(
            'pages:paymentSuccess.processing.stripePaidSync',
            'Votre paiement a bien été reçu. Nous finalisons l’enregistrement de votre commande — vous recevrez un email de confirmation sous peu.'
          ),
          undefined,
          stripeDisplay
        );
        setIsVerifying(false);
        return;
      }

      // Last resort: one more DB check in case webhook landed during fallback
      const finalCheck = await lookupOrder(sid);
      if (finalCheck.found && finalCheck.is_paid) {
        console.log('[PaymentSuccess] Order confirmed on final DB check');
        setSuccess(finalCheck.order_id!);
        setIsVerifying(false);
        return;
      }

      if (finalCheck.found) {
        setProcessing(
          'Paiement recu. La confirmation complete sera envoyee par email sous quelques minutes.',
          finalCheck.order_id
        );
        setIsVerifying(false);
        return;
      }

      // No order found yet — payment may still be finalizing; avoid error UX.
      console.warn(
        '[PaymentSuccess] No order found yet — showing processing state (not error)'
      );
      const displayAgain =
        stripeDisplay || (await fetchStripeSessionDisplay(sid));
      setDelayed(
        t(
          'pages:paymentSuccess.delayed.lead',
          'Votre commande est bien enregistrée, mais prend un peu plus de temps à apparaître. Vous recevrez un email de confirmation — aucun nouveau débit ne sera effectué.'
        ),
        undefined,
        displayAgain
      );
      setIsVerifying(false);
    };

    // ================================================================
    // PayPal flow (unchanged)
    // ================================================================
    const verifyPayPalPayment = async () => {
      try {
        const { data, error } = await invokeVerifyPaypalPayment({
          paypal_order_id: paypalOrderId,
          order_id: orderId,
        });

        if (error) {
          setProcessing(
            t(
              'pages:paymentSuccess.processing.paypalNetwork',
              'Connexion temporairement indisponible. Si PayPal a confirmé le paiement, votre commande sera enregistrée — vérifiez vos emails ou contactez le support si besoin.'
            ),
            orderId || undefined,
            null
          );
        } else if ((data as { success?: boolean })?.success) {
          const paypalData = data as {
            success?: boolean;
            order_id?: string;
            message?: string;
            transaction_id?: string;
            invoiceData?: unknown;
          };
          const finalOrderId = paypalData.order_id || orderId;
          setVerificationResult({
            state: 'success',
            message:
              paypalData.message || t('pages:paymentSuccess.success.verified'),
            orderId: finalOrderId,
            transactionId: paypalData.transaction_id,
          });
          const cust = getCustomerInfo();
          setCustomerInfo(cust);
          persistResultCache(
            {
              state: 'success',
              message:
                paypalData.message ||
                t('pages:paymentSuccess.success.verified'),
              orderId: finalOrderId || undefined,
              transactionId: paypalData.transaction_id,
            },
            null,
            cust
          );
          if (paypalData.invoiceData)
            buildInvoiceFromResponse(
              paypalData.invoiceData,
              finalOrderId!,
              cust
            );
          clearCart();
          localStorage.removeItem('cart');
          stripSensitiveParams();
          toast.success(t('pages:paymentSuccess.success.confirmed'));
        } else {
          setProcessing(
            (data as { message?: string } | null)?.message ||
              t(
                'pages:paymentSuccess.processing.paypalPending',
                'Nous finalisons la confirmation avec PayPal. Si vous avez été débité, aucune action supplémentaire n’est requise.'
              ),
            orderId || undefined,
            null
          );
        }
      } catch {
        setProcessing(
          t(
            'pages:paymentSuccess.processing.paypalUnexpected',
            'Une interruption est survenue. Si le paiement PayPal a réussi, votre commande sera traitée — vérifiez votre boîte mail ou contactez le support.'
          ),
          orderId || undefined,
          null
        );
      } finally {
        setIsVerifying(false);
      }
    };

    // Entry point
    if (!sessionId && !(isPayPal && paypalOrderId && orderId)) {
      const cached = readResultCache();
      if (cached?.verificationResult) {
        setVerificationResult(cached.verificationResult);
        setStripeSummary(cached.stripeSummary || null);
        if (cached.customerInfo) setCustomerInfo(cached.customerInfo);
        if (cached.verificationResult.state !== 'issue') {
          clearCheckoutStateAfterPayment();
        }
        setIsVerifying(false);
        return;
      }
    }

    if (isPayPal && paypalOrderId && orderId) {
      verifyPayPalPayment();
    } else if (sessionId) {
      verifyStripePayment(sessionId);
    } else {
      setIssue(
        t(
          'pages:paymentSuccess.errors.missingSessionSoft',
          'Lien de retour incomplet. Si vous avez payé, consultez votre email de confirmation ou vos commandes. Sinon, retournez au panier.'
        )
      );
      setIsVerifying(false);
    }
  }, [
    sessionId,
    isPayPal,
    paypalOrderId,
    orderId,
    clearCart,
    t,
    profile,
    user,
    buildInvoiceFromResponse,
    navigate,
    searchParams,
    paymentReturnPath,
  ]);

  // Generate and download invoice as printable HTML
  const handleDownloadInvoice = useCallback(() => {
    if (!invoiceData) return;

    const formatPrice = (value: number) => value.toFixed(2) + ' €';
    const invoiceNumber = `${new Date().getFullYear()}-${invoiceData.orderId.slice(-8).toUpperCase()}`;
    const paymentLabel =
      PAYMENT_METHOD_LABELS[invoiceData.paymentMethod] ||
      invoiceData.paymentMethod;
    const countryName = invoiceData.shippingAddress?.country
      ? COUNTRY_NAMES[invoiceData.shippingAddress.country] ||
        invoiceData.shippingAddress.country
      : '';

    const invoiceHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a1a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 48px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand-name { font-size: 28px; font-weight: 700; color: #2d5016; letter-spacing: -0.5px; }
    .brand-tagline { font-size: 11px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
    .invoice-badge h1 { font-size: 32px; font-weight: 300; color: #2d5016; text-transform: uppercase; letter-spacing: 3px; }
    .meta-strip { display: flex; gap: 0; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 32px; overflow: hidden; }
    .meta-cell { flex: 1; padding: 14px 16px; border-right: 1px solid #e5e5e5; }
    .meta-cell:last-child { border-right: none; }
    .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 600; margin-bottom: 4px; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .addresses { display: flex; gap: 40px; margin-bottom: 36px; }
    .address-block { flex: 1; }
    .address-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #2d5016; font-weight: 700; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #2d5016; display: inline-block; }
    .address-line { font-size: 12.5px; line-height: 1.7; color: #444; }
    .address-line strong { color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #2d5016; color: #fff; padding: 11px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    thead th:first-child { border-radius: 4px 0 0 0; text-align: left; }
    thead th:last-child { border-radius: 0 4px 0 0; }
    thead th.right { text-align: right; }
    tbody td { padding: 12px 14px; font-size: 12.5px; border-bottom: 1px solid #f0f0f0; color: #333; }
    tbody td.right { text-align: right; font-variant-numeric: tabular-nums; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #fafaf8; }
    .product-name { font-weight: 500; }
    .totals-wrapper { display: flex; justify-content: flex-end; margin-bottom: 36px; }
    .totals { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 12.5px; color: #555; }
    .totals-row.discount { color: #c0392b; }
    .totals-row.grand { border-top: 2px solid #2d5016; margin-top: 8px; padding-top: 12px; font-size: 16px; font-weight: 700; color: #2d5016; }
    .totals-value { font-variant-numeric: tabular-nums; font-weight: 500; }
    .totals-row.grand .totals-value { font-weight: 700; }
    .legal { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
    .legal-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #2d5016; font-weight: 700; margin-bottom: 8px; }
    .legal-text { font-size: 10.5px; line-height: 1.7; color: #888; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: flex-start; }
    .footer-company { font-size: 10px; color: #999; line-height: 1.8; }
    .footer-contact { font-size: 10px; color: #999; line-height: 1.8; text-align: right; }
    .footer-contact a { color: #2d5016; text-decoration: none; }
    .thank-you { text-align: center; margin-top: 40px; padding: 20px; background: #f7f7f2; border-radius: 6px; }
    .thank-you p { font-size: 14px; color: #2d5016; font-weight: 500; }
    .thank-you .sub { font-size: 11px; color: #888; margin-top: 4px; font-weight: 400; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-name">Rif Raw Straw</div>
        <div class="brand-tagline">Artisanat Berbère Authentique</div>
      </div>
      <div class="invoice-badge">
        <h1>Facture</h1>
      </div>
    </div>
    <div class="meta-strip">
      <div class="meta-cell">
        <div class="meta-label">N° Facture</div>
        <div class="meta-value">${invoiceNumber}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Date d'émission</div>
        <div class="meta-value">${invoiceData.date}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Mode de paiement</div>
        <div class="meta-value">${paymentLabel}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">N° Commande</div>
        <div class="meta-value">${invoiceData.orderId.slice(-8).toUpperCase()}</div>
      </div>
    </div>
    <div class="addresses">
      <div class="address-block">
        <div class="address-title">Vendeur</div>
        <div class="address-line"><strong>Rif Raw Straw</strong></div>
        <div class="address-line">Artisanat & Commerce</div>
        <div class="address-line">Email : contact@rifrawstraw.com</div>
        <div class="address-line">Web : www.rifelegance.com</div>
        <div class="address-line" style="margin-top:6px; font-size:10px; color:#aaa;">TVA non applicable, art. 293 B du CGI</div>
      </div>
      <div class="address-block">
        <div class="address-title">Client</div>
        <div class="address-line"><strong>${invoiceData.customer.firstName} ${invoiceData.customer.lastName}</strong></div>
        <div class="address-line">${invoiceData.customer.email}</div>
        ${
          invoiceData.shippingAddress
            ? `
        <div class="address-line" style="margin-top:8px;">
          <span style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:600;">Adresse de livraison</span>
        </div>
        <div class="address-line">${invoiceData.shippingAddress.line1}</div>
        ${invoiceData.shippingAddress.line2 ? `<div class="address-line">${invoiceData.shippingAddress.line2}</div>` : ''}
        <div class="address-line">${invoiceData.shippingAddress.postalCode} ${invoiceData.shippingAddress.city}</div>
        <div class="address-line">${countryName}</div>
        `
            : ''
        }
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th class="right">Qté</th>
          <th class="right">P.U. TTC</th>
          <th class="right">Total TTC</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.items
          .map(
            (item) => `
        <tr>
          <td class="product-name">${item.product_name}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${formatPrice(item.unit_price)}</td>
          <td class="right">${formatPrice(item.total_price)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>
    <div class="totals-wrapper">
      <div class="totals">
        <div class="totals-row">
          <span>Sous-total TTC</span>
          <span class="totals-value">${formatPrice(invoiceData.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>Frais de livraison</span>
          <span class="totals-value">${invoiceData.shipping > 0 ? formatPrice(invoiceData.shipping) : 'Offerts'}</span>
        </div>
        ${
          invoiceData.discount > 0
            ? `
        <div class="totals-row discount">
          <span>Réduction</span>
          <span class="totals-value">-${formatPrice(invoiceData.discount)}</span>
        </div>`
            : ''
        }
        <div class="totals-row grand">
          <span>Total TTC</span>
          <span class="totals-value">${formatPrice(invoiceData.total)}</span>
        </div>
      </div>
    </div>
    <div class="legal">
      <div class="legal-title">Mentions légales</div>
      <div class="legal-text">
        TVA non applicable, article 293 B du Code Général des Impôts.<br>
        En cas de retard de paiement (clients professionnels), pénalités de retard : 3 fois le taux d'intérêt légal.
        Indemnité forfaitaire pour frais de recouvrement : 40 €.<br>
        Conditions de retour : conformément à notre politique, retour possible sous 14 jours après réception.
      </div>
    </div>
    <div class="legal" style="margin-top: 16px; border-top: none;">
      <div class="legal-title">Références techniques</div>
      <div class="legal-text">
        ID Commande : ${invoiceData.orderId}<br>
        ${invoiceData.stripeSessionId ? `ID Transaction : ${invoiceData.stripeSessionId.slice(-12).toUpperCase()}<br>` : ''}
        Date de paiement : ${invoiceData.date}
      </div>
    </div>
    <div class="footer">
      <div class="footer-company">
        Rif Raw Straw<br>
        Artisanat Berbère Authentique<br>
        Conservation légale : 10 ans
      </div>
      <div class="footer-contact">
        <a href="mailto:contact@rifrawstraw.com">contact@rifrawstraw.com</a><br>
        <a href="https://www.rifelegance.com">www.rifelegance.com</a><br>
        Service client disponible par email
      </div>
    </div>
    <div class="thank-you">
      <p>Merci pour votre confiance !</p>
      <p class="sub">Chaque pièce est fabriquée à la main par nos artisans du Rif.</p>
    </div>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [invoiceData, t]);

  const getContactUrl = () => {
    if (!customerInfo) return '/contact';
    const params = new URLSearchParams();
    if (customerInfo.firstName) params.set('firstName', customerInfo.firstName);
    if (customerInfo.lastName) params.set('lastName', customerInfo.lastName);
    if (customerInfo.email) params.set('email', customerInfo.email);
    if (verificationResult?.orderId)
      params.set('orderId', verificationResult.orderId);
    return `/contact?${params.toString()}`;
  };

  const isSuccessState = verificationResult?.state === 'success';
  const isProcessingState = verificationResult?.state === 'processing';
  const isDelayedState = verificationResult?.state === 'delayed';
  const isIssueState = verificationResult?.state === 'issue';
  const isReassuranceState = isProcessingState || isDelayedState;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            {isVerifying ? (
              <>
                <Loader2 className="w-20 h-20 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.verifying.title')}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {processingMessage ||
                    t('pages:paymentSuccess.verifying.description')}
                </p>
              </>
            ) : isSuccessState ? (
              <>
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.success.title')}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {t('pages:paymentSuccess.success.thanks')}{' '}
                  {verificationResult.message}
                </p>
                {verificationResult.transactionId && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('pages:paymentSuccess.success.transactionId')}:{' '}
                    {verificationResult.transactionId.slice(-8).toUpperCase()}
                  </p>
                )}
                {verificationResult.orderId && (
                  <p className="text-sm text-muted-foreground mb-6">
                    {t('pages:paymentSuccess.success.orderId')}:{' '}
                    {verificationResult.orderId.slice(-8).toUpperCase()}
                  </p>
                )}
              </>
            ) : isReassuranceState ? (
              <>
                <Loader2
                  className={`w-20 h-20 mx-auto mb-4 animate-spin ${
                    isDelayedState ? 'text-amber-600' : 'text-blue-600'
                  }`}
                />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {isDelayedState
                    ? t(
                        'pages:paymentSuccess.delayed.title',
                        'Synchronisation en cours'
                      )
                    : 'Confirmation en cours'}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  {verificationResult?.message ||
                    'Nous finalisons votre commande. Aucun paiement supplementaire nest necessaire.'}
                </p>
                {isDelayedState && (
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    {t(
                      'pages:paymentSuccess.delayed.hint',
                      'Ceci est normal si le serveur est sollicité. Conservez l’email de Stripe comme preuve de paiement.'
                    )}
                  </p>
                )}
              </>
            ) : isIssueState ? (
              <>
                <AlertTriangle
                  className="w-20 h-20 text-amber-600 mx-auto mb-4"
                  aria-hidden
                />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  {t('pages:paymentSuccess.issue.title', 'Problème technique')}
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {verificationResult?.message ||
                    t(
                      'pages:paymentSuccess.issue.lead',
                      'Nous ne pouvons pas afficher cette page correctement, mais cela ne signifie pas que votre paiement a échoué.'
                    )}
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  {t(
                    'pages:paymentSuccess.issue.hint',
                    'Vérifiez votre email de confirmation ou contactez le support avec le numéro de commande si vous en avez un.'
                  )}
                </p>
              </>
            ) : null}
          </div>

          {isSuccessState && (
            <div className="bg-muted rounded-lg p-8 mb-8">
              <h2 className="text-xl font-medium text-foreground mb-4">
                {t('pages:paymentSuccess.nextSteps.title')}
              </h2>
              <div className="space-y-3 text-left max-w-md mx-auto">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                    1
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {t('pages:paymentSuccess.nextSteps.step1.title')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('pages:paymentSuccess.nextSteps.step1.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                    2
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {t('pages:paymentSuccess.nextSteps.step2.title')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('pages:paymentSuccess.nextSteps.step2.description')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-1">
                    3
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {t('pages:paymentSuccess.nextSteps.step3.title')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('pages:paymentSuccess.nextSteps.step3.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isVerifying && isReassuranceState && (
            <div
              className={`rounded-lg p-8 mb-8 text-left ${
                isDelayedState
                  ? 'bg-amber-50 dark:bg-amber-950/20'
                  : 'bg-blue-50 dark:bg-blue-950/20'
              }`}
            >
              <h2 className="text-xl font-medium text-foreground mb-4">
                {isDelayedState
                  ? t(
                      'pages:paymentSuccess.delayed.panelTitle',
                      'Paiement reçu — finalisation en arrière-plan'
                    )
                  : 'Paiement recu, confirmation en cours'}
              </h2>
              <p className="text-muted-foreground text-sm mb-3">
                Votre banque ne sera pas re-debitee. Nous finalisons la liaison
                Stripe et votre commande.
              </p>
              {stripeSummary?.customer_email && (
                <p className="text-sm text-muted-foreground">
                  Email Stripe: {stripeSummary.customer_email}
                </p>
              )}
              {typeof stripeSummary?.amount_total === 'number' && (
                <p className="text-sm text-muted-foreground">
                  Montant Stripe: {stripeSummary.amount_total.toFixed(2)}{' '}
                  {(stripeSummary.currency || 'EUR').toUpperCase()}
                </p>
              )}
              {stripeSummary?.items && stripeSummary.items.length > 0 && (
                <ul className="mt-4 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {stripeSummary.items.map((it, idx) => (
                    <li key={`${it.name}-${idx}`}>
                      {it.name} × {it.quantity} — {it.total.toFixed(2)}{' '}
                      {(stripeSummary.currency || 'EUR').toUpperCase()}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Technical issue guidance */}
          {!isVerifying && isIssueState && (
            <div className="bg-muted rounded-lg p-8 mb-8">
              <h2 className="text-xl font-medium text-foreground mb-4">
                Que faire maintenant
              </h2>
              <div className="space-y-3 text-left max-w-md mx-auto">
                <p className="text-muted-foreground text-sm">
                  Si vous avez ete debite, ne vous inquietez pas: votre paiement
                  Stripe reste trace et nous finaliserons la commande.
                </p>
                <p className="text-muted-foreground text-sm">
                  Verifiez votre boite email pour la confirmation de commande.
                  Si vous ne la recevez pas dans les 15 minutes, contactez notre
                  support.
                </p>
              </div>
            </div>
          )}

          {!isVerifying && (
            <div className="space-y-4">
              {/* Auto-redirect notice */}
              {user && isSuccessState && redirectCountdown !== null && (
                <p className="text-sm text-muted-foreground">
                  Redirection vers vos commandes dans {redirectCountdown}s…{' '}
                  <button
                    onClick={() => setRedirectCountdown(null)}
                    className="underline text-primary hover:text-primary/80"
                  >
                    Annuler
                  </button>
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                {user && isSuccessState && (
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/orders">
                      <Package className="w-5 h-5" />
                      {t('pages:paymentSuccess.viewOrders', {
                        defaultValue: 'Voir mes commandes',
                      })}
                    </Link>
                  </Button>
                )}

                {isSuccessState && invoiceData && (
                  <Button
                    onClick={handleDownloadInvoice}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('pages:paymentSuccess.invoice.download')}
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

          <div className="mt-12 p-6 bg-primary/10 rounded-lg">
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('pages:paymentSuccess.help.title')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('pages:paymentSuccess.help.description')}
            </p>
            <Button variant="outline" asChild>
              <Link to={getContactUrl()} className="flex items-center">
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

export default PaymentSuccess;
