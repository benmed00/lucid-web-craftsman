import Stripe from 'stripe';

/** Returns existing Stripe Customer id for the email, if any. */
export async function lookupStripeCustomerIdByEmail(
  stripe: Stripe,
  email: string
): Promise<string | undefined> {
  const customers: Stripe.ApiList<Stripe.Customer> =
    await stripe.customers.list({
      email,
      limit: 1,
    });
  if (customers.data.length > 0) {
    return customers.data[0].id;
  }
  return undefined;
}
