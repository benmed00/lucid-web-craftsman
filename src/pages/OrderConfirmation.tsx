import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock3,
  Home,
  Loader2,
  Mail,
  RefreshCcw,
  ShoppingBag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { supabase } from '@/integrations/supabase/client';
import { disableServiceWorkerForCriticalFlow } from '@/utils/cacheOptimization';

type ConfirmationState =
  | 'verifying'
  | 'success'
  | 'payment_failed'
  | 'technical_issue';

interface ConfirmationItem {
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  image?: string | null;
}

interface ConfirmationResult {
  orderId?: string;
  orderReference?: string;
  pageVariant?: 'success' | 'payment_failed';
  amount?: number;
  currency?: string;
  createdAt?: string;
  customerName?: string;
  customerEmail?: string | null;
  statusLabel?: string;
  statusMessage?: string;
  items?: ConfirmationItem[];
}

const ORDER_CONFIRMATION_CACHE_PREFIX = 'order_confirmation_cache:';
const ORDER_CONFIRMATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);

const normalizeImageUrl = (raw?: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
};

const OrderConfirmation = () => {
  const { orderReference: routeReference } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runRef = useRef(false);

  const token = searchParams.get('token');

  const [state, setState] = useState<ConfirmationState>('verifying');
  const [message, setMessage] = useState('Nous confirmons votre commande…');
  const [result, setResult] = useState<ConfirmationResult>({});

  useEffect(() => {
    disableServiceWorkerForCriticalFlow().catch(() => {
      /* non-blocking */
    });
  }, []);

  useEffect(() => {
    if (runRef.current) return;
    runRef.current = true;

    const verify = async () => {
      let effectiveReference = routeReference || '';
      const cacheKey = routeReference
        ? `${ORDER_CONFIRMATION_CACHE_PREFIX}${routeReference}`
        : null;
      const readCache = () => {
        if (!cacheKey) return null;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw) as {
            createdAt?: number;
            state?: ConfirmationState;
            message?: string;
            result?: ConfirmationResult;
          };
          if (!parsed?.createdAt || !parsed?.state || !parsed?.message)
            return null;
          if (Date.now() - parsed.createdAt > ORDER_CONFIRMATION_CACHE_TTL_MS) {
            localStorage.removeItem(cacheKey);
            return null;
          }
          return parsed;
        } catch {
          return null;
        }
      };
      const persistCache = (
        nextState: ConfirmationState,
        nextMessage: string,
        nextResult: ConfirmationResult
      ) => {
        if (!cacheKey) return;
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              createdAt: Date.now(),
              state: nextState,
              message: nextMessage,
              result: nextResult,
            })
          );
        } catch {
          // ignore storage errors
        }
      };

      if (!token) {
        const cached = readCache();
        if (cached) {
          setState(cached.state!);
          setMessage(cached.message!);
          setResult(cached.result || {});
          return;
        }
        setState('technical_issue');
        setMessage(
          'Le lien est incomplet. Utilisez le lien recu dans votre email de confirmation.'
        );
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          'order-confirmation-lookup',
          {
            body: { token, order_reference: routeReference || null },
          }
        );

        if (error || !data?.found) {
          const nextMessage =
            "Nous ne pouvons pas valider cette commande pour le moment. Contactez le support avec votre reference d'email.";
          setState('technical_issue');
          setMessage(nextMessage);
          persistCache('technical_issue', nextMessage, {});
          return;
        }

        const pageVariant: ConfirmationResult['pageVariant'] =
          data.page_variant === 'payment_failed' ? 'payment_failed' : 'success';

        const nextResult: ConfirmationResult = {
          orderId: data.order_id,
          orderReference: data.order_reference,
          pageVariant,
          amount: typeof data.amount === 'number' ? data.amount : undefined,
          currency:
            typeof data.currency === 'string'
              ? data.currency.toUpperCase()
              : undefined,
          createdAt: data.created_at,
          customerName: data.customer_name || 'Client inconnu',
          customerEmail: data.customer_email || null,
          statusLabel: data.status_label,
          statusMessage: data.status_message,
          items: Array.isArray(data.items) ? data.items : [],
        };
        setResult(nextResult);
        effectiveReference = nextResult.orderReference || effectiveReference;

        if (nextResult.pageVariant === 'payment_failed') {
          const nextMessage =
            "Votre paiement n'a pas pu etre finalise. Aucune somme n'a ete prelevee.";
          setState('payment_failed');
          setMessage(nextMessage);
          persistCache('payment_failed', nextMessage, nextResult);
        } else {
          const nextMessage =
            'Votre paiement a bien ete recu et votre commande est en cours de traitement.';
          setState('success');
          setMessage(nextMessage);
          persistCache('success', nextMessage, nextResult);
        }
      } catch {
        const nextMessage =
          'Un probleme technique empeche la verification instantanee. Notre equipe vous aide a resoudre cela.';
        setState('technical_issue');
        setMessage(nextMessage);
        persistCache('technical_issue', nextMessage, {});
      } finally {
        // Remove token from URL while keeping a unique public reference route.
        if (effectiveReference) {
          navigate(
            `/order-confirmation/${encodeURIComponent(effectiveReference)}`,
            {
              replace: true,
            }
          );
        } else {
          navigate('/order-confirmation', { replace: true });
        }
      }
    };

    verify();
  }, [navigate, routeReference, token]);

  const orderLabel = useMemo(() => {
    if (result.orderReference) return result.orderReference;
    if (routeReference) return routeReference;
    if (result.orderId)
      return `CMD-${result.orderId.replace(/-/g, '').toUpperCase()}`;
    return null;
  }, [result.orderId, result.orderReference, routeReference]);

  const dateLabel = useMemo(
    () =>
      result.createdAt
        ? new Date(result.createdAt).toLocaleDateString('fr-FR')
        : '--',
    [result.createdAt]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            {state === 'verifying' && (
              <>
                <Loader2 className="w-20 h-20 text-primary mx-auto mb-4 animate-spin" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Confirmation en cours
                </h1>
              </>
            )}

            {state === 'success' && (
              <>
                <CheckCircle className="w-20 h-20 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Paiement confirme
                </h1>
              </>
            )}

            {state === 'payment_failed' && (
              <>
                <AlertTriangle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Oups... le paiement n'a pas abouti
                </h1>
              </>
            )}

            {state === 'technical_issue' && (
              <>
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Oups... quelque chose n'a pas fonctionne
                </h1>
              </>
            )}

            <p className="text-lg text-muted-foreground mb-4">{message}</p>

            {state !== 'verifying' && (
              <p className="text-base text-foreground/80">
                Notre equipe traite votre commande normalement.
              </p>
            )}
          </div>

          {state !== 'verifying' && (
            <div className="rounded-lg border bg-card text-left overflow-hidden mb-8">
              <div className="px-6 py-4 bg-muted/40 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-lg font-semibold">
                    Commande #{orderLabel || '---'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Date: {dateLabel}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-b">
                <p className="font-medium">
                  {result.customerName || 'Client inconnu'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.customerEmail || 'Email inconnu'}
                </p>
              </div>

              <div className="px-6 py-4 border-b">
                <h3 className="font-medium mb-3">Details</h3>
                <div className="space-y-3">
                  {(result.items || []).map((item, index) => (
                    <div
                      key={`${item.product_name}-${index}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={normalizeImageUrl(item.image) || undefined}
                            alt={item.product_name}
                            className="w-12 h-12 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded border bg-muted" />
                        )}
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantite: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatMoney(
                          item.total_price,
                          result.currency || 'EUR'
                        )}
                      </div>
                    </div>
                  ))}
                  {(result.items || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Les details de commande seront disponibles sous peu.
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-xl font-semibold">
                    {formatMoney(result.amount || 0, result.currency || 'EUR')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {state !== 'verifying' && (
            <div className="rounded-lg border bg-muted/30 p-6 mb-8">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock3 className="w-5 h-5" />
                <p className="text-xl font-semibold">
                  Statut: {result.statusLabel || 'Probleme technique'}
                </p>
              </div>
              <p className="text-muted-foreground">
                {result.statusMessage || message}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" className="gap-2" disabled>
                <Clock3 className="w-4 h-4" />
                Voir le suivi (bientot)
              </Button>
              <Button asChild className="gap-2">
                <Link
                  to={
                    orderLabel
                      ? `/contact?orderRef=${encodeURIComponent(orderLabel)}`
                      : '/contact'
                  }
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/products">
                  <ShoppingBag className="w-4 h-4" />
                  Continuer vos achats
                </Link>
              </Button>
            </div>
          )}

          {state === 'payment_failed' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gap-2">
                <Link to="/checkout">
                  <RefreshCcw className="w-4 h-4" />
                  Reessayer le paiement
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/checkout">
                  <ShoppingBag className="w-4 h-4" />
                  Choisir un autre moyen de paiement
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link
                  to={
                    orderLabel
                      ? `/contact?orderRef=${encodeURIComponent(orderLabel)}`
                      : '/contact'
                  }
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          )}

          {state === 'technical_issue' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="gap-2">
                <Link to="/checkout">
                  <RefreshCcw className="w-4 h-4" />
                  Reessayer le paiement
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/products">
                  <ShoppingBag className="w-4 h-4" />
                  Continuer vos achats
                </Link>
              </Button>
              <Button asChild variant="secondary" className="gap-2">
                <Link
                  to={
                    orderLabel
                      ? `/contact?orderRef=${encodeURIComponent(orderLabel)}`
                      : '/contact'
                  }
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <Link to="/">
                  <Home className="w-4 h-4" />
                  Retour a l'accueil
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <PageFooter />
    </div>
  );
};

export default OrderConfirmation;
