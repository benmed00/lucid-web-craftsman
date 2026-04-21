import { lazy, LazyExoticComponent, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { SetURLSearchParams } from 'react-router-dom';

import {
  legacyStripeCheckoutSessionId,
  looksLikeOrderUuid,
  resolvePaymentReturnOrderId,
} from '@/lib/checkout/paymentReturnKeys';

const PaymentSuccess: LazyExoticComponent<() => JSX.Element> = lazy(
  () => import('./PaymentSuccess')
);
const OrderConfirmation: LazyExoticComponent<() => JSX.Element> = lazy(
  () => import('./OrderConfirmation')
);

const EntryFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center bg-background">
    <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
  </div>
);

/**
 * /order-confirmation: Stripe/PayPal return uses PaymentSuccess; signed email links
 * use `/order-confirmation/:ref` (OrderConfirmation).
 */
const OrderConfirmationEntry = () => {
  const [searchParams]: [URLSearchParams, SetURLSearchParams] =
    useSearchParams();
  const returnOrderId: string | null =
    resolvePaymentReturnOrderId(searchParams);
  const legacyStripeSessionId: string | null =
    legacyStripeCheckoutSessionId(searchParams);
  /** Set after return when sensitive query params are stripped — keeps PaymentSuccess mounted. */
  const paymentComplete: boolean = searchParams.get('payment_complete') === '1';
  const isPayPal: boolean = searchParams.get('paypal') === 'true';
  const paypalToken: string | null = searchParams.get('token');
  const paypalDbOrderId: string | null = searchParams.get('order_id');

  const isPaymentReturn: boolean =
    !!returnOrderId ||
    !!legacyStripeSessionId ||
    paymentComplete ||
    (isPayPal &&
      !!paypalToken &&
      !!paypalDbOrderId &&
      looksLikeOrderUuid(paypalDbOrderId));

  return (
    <Suspense fallback={<EntryFallback />}>
      {isPaymentReturn ? <PaymentSuccess /> : <OrderConfirmation />}
    </Suspense>
  );
};

export default OrderConfirmationEntry;
