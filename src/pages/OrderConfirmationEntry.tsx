import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PaymentSuccess = lazy(() => import('./PaymentSuccess'));
const OrderConfirmation = lazy(() => import('./OrderConfirmation'));

const EntryFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-background">
    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
  </div>
);

/**
 * /order-confirmation: Stripe/PayPal return uses PaymentSuccess; email links
 * without payment params use OrderConfirmation (token / order reference).
 */
const OrderConfirmationEntry = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isPayPal = searchParams.get('paypal') === 'true';
  const paypalToken = searchParams.get('token');
  const paypalOrderId = searchParams.get('order_id');

  const isPaymentReturn =
    !!sessionId || (isPayPal && !!paypalToken && !!paypalOrderId);

  return (
    <Suspense fallback={<EntryFallback />}>
      {isPaymentReturn ? <PaymentSuccess /> : <OrderConfirmation />}
    </Suspense>
  );
};

export default OrderConfirmationEntry;
