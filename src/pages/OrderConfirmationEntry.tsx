import { lazy, LazyExoticComponent, Suspense, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { classifyOrderConfirmationRoute } from '@/lib/checkout/orderConfirmationRoute';

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
 * `/order-confirmation` dispatcher.
 *
 * Three possible outcomes, decided by `classifyOrderConfirmationRoute`:
 *
 *   1. `payment_success` — fresh Stripe/PayPal return OR continuation
 *      marker (`payment_complete=1`). Render `<PaymentSuccess>`.
 *
 *   2. `canonicalize` — URL uses a legacy shape (`?order=<uuid>` or a
 *      UUID-shaped `session_id`). Rewrite to `?order_id=<uuid>` via
 *      `navigate({ replace: true })` and the next render falls through
 *      to case 3.
 *
 *   3. `order_confirmation` — canonical `?order_id=<uuid>` (or nothing).
 *      Render `<OrderConfirmation>`; its own signed-token flow takes
 *      over and shows an empty state if the param is missing.
 *
 * Before this dispatcher existed, case 2 was handled by bouncing through
 * `<PaymentSuccess>` which did an edge-function lookup AND a redirect —
 * one extra hop per inbox click, visible to the customer as a brief
 * spinner.
 */
const OrderConfirmationEntry = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const route = classifyOrderConfirmationRoute(searchParams);

  useEffect(() => {
    if (route.kind === 'canonicalize') {
      navigate(
        {
          pathname: '/order-confirmation',
          search: `?${route.nextSearch}`,
        },
        { replace: true }
      );
    }
    // `searchParams` is the actual dependency; it drives `route`. React
    // Router returns the same instance reference across renders unless the
    // URL changed, which is what we want.
  }, [route, navigate]);

  if (route.kind === 'canonicalize') {
    // Show the fallback spinner while the navigation microtask runs.
    return <EntryFallback />;
  }

  return (
    <Suspense fallback={<EntryFallback />}>
      {route.kind === 'payment_success' ? (
        <PaymentSuccess />
      ) : (
        <OrderConfirmation />
      )}
    </Suspense>
  );
};

export default OrderConfirmationEntry;
