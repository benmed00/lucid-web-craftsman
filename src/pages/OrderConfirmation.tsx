import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertTriangle, Home, ShoppingBag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import PageFooter from '@/components/PageFooter';
import { supabase } from '@/integrations/supabase/client';
import { disableServiceWorkerForCriticalFlow } from '@/utils/cacheOptimization';

type ConfirmationState = 'verifying' | 'success' | 'processing' | 'issue';

interface ConfirmationResult {
  orderId?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string | null;
}

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runRef = useRef(false);

  const orderId = searchParams.get('order_id');
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
      if (!orderId || !token) {
        setState('issue');
        setMessage(
          'Le lien de confirmation est incomplet. Veuillez utiliser le lien reçu par email.'
        );
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          'order-confirmation-lookup',
          {
            body: { order_id: orderId, token },
          }
        );

        if (error || !data?.found) {
          setState('issue');
          setMessage(
            'Nous ne pouvons pas retrouver cette commande pour le moment. Contactez le support si besoin.'
          );
          return;
        }

        setResult({
          orderId: data.order_id,
          amount: typeof data.amount === 'number' ? data.amount / 100 : undefined,
          currency:
            typeof data.currency === 'string'
              ? data.currency.toUpperCase()
              : undefined,
          customerEmail: data.customer_email || null,
        });

        if (data.is_paid) {
          setState('success');
          setMessage('Votre paiement est confirmé et votre commande est validée.');
        } else {
          setState('processing');
          setMessage(
            'Votre paiement a ete recu. Nous finalisons encore la confirmation de commande.'
          );
        }
      } catch {
        setState('issue');
        setMessage(
          'Un probleme technique empeche la verification instantanee. Notre equipe peut vous aider.'
        );
      } finally {
        // Remove token from URL to prevent accidental sharing/replay.
        navigate(`/order-confirmation?order_id=${encodeURIComponent(orderId)}`, {
          replace: true,
        });
      }
    };

    verify();
  }, [navigate, orderId, token]);

  const orderLabel = useMemo(
    () => (result.orderId ? result.orderId.slice(-8).toUpperCase() : null),
    [result.orderId]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
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
                  Commande confirmee
                </h1>
              </>
            )}

            {state === 'processing' && (
              <>
                <Loader2 className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-spin" />
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Confirmation en cours
                </h1>
              </>
            )}

            {state === 'issue' && (
              <>
                <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
                  Verification manuelle necessaire
                </h1>
              </>
            )}

            <p className="text-lg text-muted-foreground mb-4">{message}</p>

            {orderLabel && (
              <p className="text-sm text-muted-foreground">
                Commande: <span className="font-medium">{orderLabel}</span>
              </p>
            )}
            {result.amount && (
              <p className="text-sm text-muted-foreground">
                Montant: {result.amount.toFixed(2)} {result.currency || 'EUR'}
              </p>
            )}
            {result.customerEmail && (
              <p className="text-sm text-muted-foreground">
                Email: {result.customerEmail}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/products">
                <ShoppingBag className="w-5 h-5" />
                Continuer vos achats
              </Link>
            </Button>

            <Button variant="secondary" asChild className="gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                Retour a l'accueil
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
