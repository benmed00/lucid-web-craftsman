/**
 * Prerequisites: none (Vitest only).
 * Run: `pnpm exec vitest run src/types/contracts/edge-invoke-responses.test.ts`
 */
import { describe, expect, it } from 'vitest';
import {
  parseCreatePaymentInvokeBody,
  parseOrderLookupResponse,
  parseStripeSessionDisplayResponse,
} from './edge-invoke-responses';

describe('parseCreatePaymentInvokeBody', () => {
  it('accepts Stripe redirect payload', () => {
    expect(
      parseCreatePaymentInvokeBody({
        url: 'https://checkout.stripe.com/c/pay/cs_test',
      })
    ).toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test',
    });
  });

  it('returns empty object for invalid shapes without throwing', () => {
    expect(parseCreatePaymentInvokeBody(null)).toEqual({});
  });
});

describe('parseOrderLookupResponse', () => {
  it('parses found:false', () => {
    const r = parseOrderLookupResponse({ found: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.found).toBe(false);
  });

  it('parses found:true with order_id', () => {
    const r = parseOrderLookupResponse({
      found: true,
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      order_items: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.found).toBe(true);
      expect(r.data.order_id).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });
});

describe('parseStripeSessionDisplayResponse', () => {
  it('parses success snapshot', () => {
    const r = parseStripeSessionDisplayResponse({
      ok: true,
      session_id: 'cs_test',
      payment_status: 'paid',
      items: [{ name: 'A', quantity: 1, total: 10 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.payment_status).toBe('paid');
  });
});
