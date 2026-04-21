/**
 * Tests for `paymentMethodLabel`. Small but worth pinning — the label is
 * written into `orders.metadata.payment_method_label` by `confirm-order.ts`
 * and echoed back to the UI by `get-order-by-token` through its whitelist.
 */
import { assertEquals } from '@std/assert';
import {
  KNOWN_PAYMENT_METHODS,
  paymentMethodLabel,
} from './payment-method-label.ts';

Deno.test('paymentMethodLabel: cards and wallets', () => {
  assertEquals(paymentMethodLabel('card'), 'Carte bancaire');
  assertEquals(paymentMethodLabel('link'), 'Link');
  assertEquals(paymentMethodLabel('apple_pay'), 'Apple Pay');
  assertEquals(paymentMethodLabel('google_pay'), 'Google Pay');
  assertEquals(paymentMethodLabel('samsung_pay'), 'Samsung Pay');
  assertEquals(paymentMethodLabel('amazon_pay'), 'Amazon Pay');
  assertEquals(paymentMethodLabel('cashapp'), 'Cash App Pay');
});

Deno.test('paymentMethodLabel: bank redirect / account', () => {
  assertEquals(paymentMethodLabel('paypal'), 'PayPal');
  assertEquals(paymentMethodLabel('sepa_debit'), 'Prélèvement SEPA');
  assertEquals(paymentMethodLabel('us_bank_account'), 'Virement bancaire (ACH)');
  assertEquals(paymentMethodLabel('bacs_debit'), 'Prélèvement Bacs');
  assertEquals(paymentMethodLabel('au_becs_debit'), 'Prélèvement BECS');
  assertEquals(paymentMethodLabel('ideal'), 'iDEAL');
  assertEquals(paymentMethodLabel('bancontact'), 'Bancontact');
  assertEquals(paymentMethodLabel('giropay'), 'Giropay');
  assertEquals(paymentMethodLabel('sofort'), 'Sofort');
  assertEquals(paymentMethodLabel('eps'), 'EPS');
  assertEquals(paymentMethodLabel('p24'), 'Przelewy24');
  assertEquals(paymentMethodLabel('fpx'), 'FPX');
});

Deno.test('paymentMethodLabel: BNPL', () => {
  assertEquals(paymentMethodLabel('klarna'), 'Klarna');
  assertEquals(
    paymentMethodLabel('afterpay_clearpay'),
    'Afterpay / Clearpay'
  );
  assertEquals(paymentMethodLabel('affirm'), 'Affirm');
});

Deno.test('paymentMethodLabel: offline / in-store', () => {
  assertEquals(paymentMethodLabel('cod'), 'Paiement à la livraison');
  assertEquals(paymentMethodLabel('customer_balance'), 'Virement bancaire');
  assertEquals(paymentMethodLabel('multibanco'), 'Multibanco');
  assertEquals(paymentMethodLabel('konbini'), 'Konbini');
  assertEquals(paymentMethodLabel('oxxo'), 'OXXO');
  assertEquals(paymentMethodLabel('boleto'), 'Boleto');
  assertEquals(paymentMethodLabel('wechat_pay'), 'WeChat Pay');
  assertEquals(paymentMethodLabel('alipay'), 'Alipay');
  assertEquals(paymentMethodLabel('blik'), 'BLIK');
  assertEquals(paymentMethodLabel('promptpay'), 'PromptPay');
  assertEquals(paymentMethodLabel('pix'), 'Pix');
  assertEquals(paymentMethodLabel('grabpay'), 'GrabPay');
});

Deno.test('paymentMethodLabel: case-insensitive + trims whitespace', () => {
  assertEquals(paymentMethodLabel('CARD'), 'Carte bancaire');
  assertEquals(paymentMethodLabel('  paypal  '), 'PayPal');
  assertEquals(paymentMethodLabel('Apple_Pay'), 'Apple Pay');
});

Deno.test('paymentMethodLabel: unknown / null / empty fall back safely', () => {
  // Fallback matches OrderConfirmation.tsx's literal so the UI never shifts
  // unexpectedly when a new Stripe method appears.
  assertEquals(paymentMethodLabel('some_new_method'), 'Carte bancaire');
  assertEquals(paymentMethodLabel(null), 'Carte bancaire');
  assertEquals(paymentMethodLabel(undefined), 'Carte bancaire');
  assertEquals(paymentMethodLabel(''), 'Carte bancaire');
});

Deno.test('KNOWN_PAYMENT_METHODS: introspection covers every entry', () => {
  for (const key of KNOWN_PAYMENT_METHODS) {
    const label = paymentMethodLabel(key);
    if (label === 'Carte bancaire' && key !== 'card') {
      throw new Error(
        `KNOWN_PAYMENT_METHODS includes "${key}" but it maps to the default label — likely a typo in LABELS.`
      );
    }
  }
  // A floor: we should cover at least the common set.
  const minimum = [
    'card',
    'paypal',
    'cod',
    'apple_pay',
    'google_pay',
    'afterpay_clearpay',
    'us_bank_account',
  ];
  for (const key of minimum) {
    if (!KNOWN_PAYMENT_METHODS.includes(key)) {
      throw new Error(`KNOWN_PAYMENT_METHODS missing required entry "${key}"`);
    }
  }
});
