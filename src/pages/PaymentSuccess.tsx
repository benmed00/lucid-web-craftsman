/**
 * Legacy PaymentSuccess page — redirects to /order-confirmation
 *
 * Kept for backward compatibility with old email links that use
 * /payment-success?session_id=... format.
 *
 * For session_id-based links, we look up the order by stripe_session_id
 * and redirect to /order-confirmation?order_id=...
 *
 * For direct order_id links, we redirect immediately.
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { invokeOrderLookup } from '@/services/checkoutApi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalToken = searchParams.get('token');
  const [error, setError] = useState(false);

  useEffect(() => {
    // If order_id is already present, redirect immediately
    if (orderId) {
      const params = new URLSearchParams();
      params.set('order_id', orderId);
      params.set('payment_complete', '1');
      if (isPayPal) params.set('paypal', 'true');
      if (paypalToken) params.set('token', paypalToken);
      navigate(`/order-confirmation?${params.toString()}`, { replace: true });
      return;
    }

    // If session_id is present, look up order by stripe_session_id
    if (sessionId) {
      const lookupBySession = async () => {
        try {
          const { data, error: fnError } = await invokeOrderLookup({
            session_id: sessionId,
          });
          const row = data as { found?: boolean; order_id?: string } | null;

          if (fnError || !row?.found || !row?.order_id) {
            // Couldn't find order — show a generic processing message
            // The order-confirmation page handles this gracefully
            console.warn(
              '[PaymentSuccess] Could not resolve session_id to order_id, redirecting anyway'
            );
            setError(true);
            return;
          }

          navigate(
            `/order-confirmation?order_id=${encodeURIComponent(row.order_id)}&payment_complete=1`,
            { replace: true }
          );
        } catch {
          setError(true);
        }
      };

      lookupBySession();
      return;
    }

    // No identifiers at all
    setError(true);
  }, [sessionId, orderId, isPayPal, paypalToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-muted-foreground mb-4">
            Nous ne trouvons pas votre commande. Si vous avez effectué un
            paiement, vérifiez votre email pour la confirmation.
          </p>
          <a href="/contact" className="text-primary underline">
            Contacter le support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
        <p className="text-muted-foreground">Redirection en cours…</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
