/**
 * Maps an internal `payment_method` string (from Stripe's
 * `session.payment_method_types[0]`, or `'cod'` for cash-on-delivery) to a
 * human-readable French label suitable for display on the order-confirmation
 * page and in emails.
 *
 * Written to `orders.metadata.payment_method_label` by
 * `_shared/confirm-order.ts` so the read-side (`get-order-by-token`) can
 * forward it through the `PUBLIC_ORDER_METADATA_KEYS` whitelist without
 * recomputing.
 *
 * Unknown methods fall back to 'Carte bancaire' (matches
 * `OrderConfirmation.tsx`'s literal fallback) — safe default that never
 * misleads the buyer into thinking they paid by an unexpected method.
 *
 * Dictionary coverage aligns with Stripe's `payment_method_types` values as
 * of 2026-04. Source: https://docs.stripe.com/api/payment_methods/object
 * When Stripe adds a new method, add it here AND extend
 * `payment-method-label_test.ts` to lock the mapping.
 */

const LABELS: Record<string, string> = {
  // Cards & wallets
  card: 'Carte bancaire',
  link: 'Link',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  samsung_pay: 'Samsung Pay',
  amazon_pay: 'Amazon Pay',
  cashapp: 'Cash App Pay',

  // Bank-redirect / account
  paypal: 'PayPal',
  sepa_debit: 'Prélèvement SEPA',
  us_bank_account: 'Virement bancaire (ACH)',
  bacs_debit: 'Prélèvement Bacs',
  au_becs_debit: 'Prélèvement BECS',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  giropay: 'Giropay',
  sofort: 'Sofort',
  eps: 'EPS',
  p24: 'Przelewy24',
  fpx: 'FPX',

  // Buy-now-pay-later
  klarna: 'Klarna',
  afterpay_clearpay: 'Afterpay / Clearpay',
  affirm: 'Affirm',

  // Offline / in-store
  cod: 'Paiement à la livraison',
  customer_balance: 'Virement bancaire',
  multibanco: 'Multibanco',
  konbini: 'Konbini',
  oxxo: 'OXXO',
  boleto: 'Boleto',
  wechat_pay: 'WeChat Pay',
  alipay: 'Alipay',
  blik: 'BLIK',
  promptpay: 'PromptPay',
  pix: 'Pix',
  grabpay: 'GrabPay',
};

const DEFAULT_LABEL = 'Carte bancaire';

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return DEFAULT_LABEL;
  const key = method.trim().toLowerCase();
  return LABELS[key] ?? DEFAULT_LABEL;
}

/** Exported for tests and introspection. The set of Stripe method ids the
 *  dictionary knows about; all others map to {@link DEFAULT_LABEL}. */
export const KNOWN_PAYMENT_METHODS: readonly string[] = Object.freeze(
  Object.keys(LABELS)
);
