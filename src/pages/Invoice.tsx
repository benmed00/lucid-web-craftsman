/**
 * /invoice/:orderId — Backend-driven invoice page.
 *
 * Reads optional ?token=... for guest access via signed URL.
 * Calls the generate-invoice Edge Function and renders the returned HTML
 * inline via iframe srcDoc — clean same-origin URL, no blob: URLs.
 *
 * "Ma commande" links with `?order_id=` only: order confirmation mints a
 * fresh `order_access` token. Do not pass the invoice `invoice_access`
 * token — get-order-by-token accepts only `order_access`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Loader2,
  AlertTriangle,
  Printer,
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { fetchInvoice, InvoiceError } from '@/lib/invoice/generateInvoice';

const InvoicePage = () => {
  const { t } = useTranslation('pages');
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || undefined;
  const autoPrint = searchParams.get('print') === '1';

  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const shortId = (orderId || '').slice(-8).toUpperCase();

  const isAuthError = errorStatus === 401 || errorStatus === 403;

  const friendlyMessage = useCallback(
    (status: number | null, raw: string | null): string => {
      if (status === 401 || status === 403) {
        return t('invoicePage.errorAuth', {
          defaultValue:
            'Accès à cette facture refusé. Le lien a peut-être expiré ou ne vous appartient pas. Connectez-vous ou utilisez le lien envoyé par email, puis réessayez.',
        });
      }
      if (status === 404) {
        return t('invoicePage.errorNotFound', {
          defaultValue: 'Facture introuvable pour cette commande.',
        });
      }
      if (status && status >= 500) {
        return t('invoicePage.errorServer', {
          defaultValue:
            'Le service de facturation est momentanément indisponible. Merci de réessayer dans quelques instants.',
        });
      }
      return raw || t('invoicePage.errorGeneric');
    },
    [t]
  );

  const load = useCallback(
    async (isRetry = false) => {
      if (!orderId) return;
      if (isRetry) setRetrying(true);
      else setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const { html } = await fetchInvoice(orderId, token);
        setHtml(html);
        if (isRetry) {
          toast.success(
            t('invoicePage.retrySuccess', {
              defaultValue: 'Facture chargée avec succès.',
            })
          );
        }
      } catch (e) {
        const status = e instanceof InvoiceError ? (e.status ?? null) : null;
        const raw = e instanceof Error ? e.message : null;
        const msg = friendlyMessage(status, raw);
        setErrorStatus(status);
        setError(msg);
        toast.error(
          status === 401 || status === 403
            ? t('invoicePage.toastAuthTitle', {
                defaultValue: 'Accès refusé à la facture',
              })
            : t('invoicePage.toastErrorTitle', {
                defaultValue: 'Échec de génération de la facture',
              }),
          { description: msg }
        );
      } finally {
        setLoading(false);
        setRetrying(false);
      }
    },
    [orderId, token, friendlyMessage, t]
  );

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Auto-print when ?print=1 and iframe is ready
  useEffect(() => {
    if (!autoPrint || !html) return;
    const timer = setTimeout(() => {
      try {
        iframeRef.current?.contentWindow?.print();
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [autoPrint, html]);

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.print();
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {t('invoicePage.generating')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t('invoicePage.orderShort', { shortId })}
          </p>
        </div>
      </div>
    );
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
          <div
            className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isAuthError ? 'bg-amber-500/10' : 'bg-destructive/10'
            }`}
          >
            {isAuthError ? (
              <Lock className="w-7 h-7 text-amber-600" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-destructive" />
            )}
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-2">
            {isAuthError
              ? t('invoicePage.unauthorizedTitle', {
                  defaultValue: 'Accès à la facture refusé',
                })
              : t('invoicePage.unavailableTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mb-1">
            {t('invoicePage.orderLine')}{' '}
            <span className="font-mono font-medium text-foreground">
              #{shortId}
            </span>
          </p>
          {errorStatus && (
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mt-1">
              {t('invoicePage.errorCode', {
                defaultValue: 'Code',
              })}
              : {errorStatus}
            </p>
          )}
          <p
            className={`text-sm mt-4 mb-6 ${
              isAuthError ? 'text-foreground/80' : 'text-destructive'
            }`}
          >
            {error || t('invoicePage.noContent')}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => void load(true)}
              disabled={retrying}
              size="sm"
              className="gap-2"
            >
              {retrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {retrying
                ? t('invoicePage.retrying', {
                    defaultValue: 'Nouvelle tentative…',
                  })
                : t('invoicePage.retry')}
            </Button>
            {isAuthError && (
              <Button asChild variant="outline" size="sm">
                <Link
                  to={`/auth?redirect=${encodeURIComponent(`/invoice/${orderId ?? ''}`)}`}
                >
                  {t('invoicePage.signIn', {
                    defaultValue: 'Se connecter',
                  })}
                </Link>
              </Button>
            )}
            <Button asChild variant="secondary" size="sm">
              <Link to="/contact">{t('invoicePage.contactSupport')}</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            {t('invoicePage.helpPrefix')}{' '}
            <a
              className="text-primary underline"
              href="mailto:contact@rifelegance.com"
            >
              contact@rifelegance.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Toolbar — hidden when printing */}
      <div className="bg-card border-b border-border shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link
                to={`/order-confirmation?order_id=${encodeURIComponent(orderId ?? '')}`}
              >
                <ArrowLeft className="w-4 h-4" /> {t('invoicePage.backToOrder')}
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {t('invoicePage.invoiceLabel', { shortId })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link to="/products">
                <ShoppingBag className="w-4 h-4" /> {t('invoicePage.shop')}
              </Link>
            </Button>
            <Button onClick={handlePrint} size="sm" className="gap-2">
              <Printer className="w-4 h-4" /> {t('invoicePage.printPdf')}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice — rendered in iframe so its CSS is fully isolated */}
      <div className="flex-1 p-2 sm:p-6 print:p-0">
        <div className="max-w-4xl mx-auto bg-white shadow-xl print:shadow-none print:max-w-none">
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title={t('invoicePage.iframeTitle', { orderId: orderId ?? '' })}
            className="w-full border-0 print:h-auto"
            style={{ height: 'calc(100vh - 100px)', minHeight: '900px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
