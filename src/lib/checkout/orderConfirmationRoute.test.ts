import { describe, it, expect } from 'vitest';

import { classifyOrderConfirmationRoute } from './orderConfirmationRoute';

const ORDER_UUID = '11111111-2222-4333-8444-555555555555';
const OTHER_UUID = '22222222-3333-4444-8555-666666666666';

function sp(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe('classifyOrderConfirmationRoute — fresh returns go to PaymentSuccess', () => {
  it('R1: Stripe cs_* session_id is a fresh return', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`order_id=${ORDER_UUID}&session_id=cs_test_abc`)
    );
    expect(route.kind).toBe('payment_success');
  });

  it('R2: PayPal with token + UUID order_id is a fresh return', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`paypal=true&token=EC-PAYPALTOKEN&order_id=${ORDER_UUID}`)
    );
    expect(route.kind).toBe('payment_success');
  });

  it('R3: order_id + payment_complete=1 classifies as fresh return (PaymentSuccess then strips marker)', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`order_id=${ORDER_UUID}&payment_complete=1`)
    );
    expect(route.kind).toBe('payment_success');
  });

  it('R3: payment_complete=1 alone (after PaymentSuccess strips everything) still counts', () => {
    const route = classifyOrderConfirmationRoute(sp(`payment_complete=1`));
    expect(route.kind).toBe('payment_success');
  });

  it('PayPal without a UUID-shaped order_id does NOT count as fresh', () => {
    // Defensive: a malformed PayPal return should NOT get the fresh-return
    // treatment because our lookup key would be bogus.
    const route = classifyOrderConfirmationRoute(
      sp(`paypal=true&token=EC-PAYPALTOKEN&order_id=not-a-uuid`)
    );
    expect(route.kind).toBe('order_confirmation');
  });

  it('PayPal without a token does NOT count as fresh', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`paypal=true&order_id=${ORDER_UUID}`)
    );
    expect(route.kind).toBe('order_confirmation');
  });
});

describe('classifyOrderConfirmationRoute — stale email clicks go to OrderConfirmation', () => {
  it('canonical ?order_id=<uuid> alone renders OrderConfirmation directly (the regression fix)', () => {
    const route = classifyOrderConfirmationRoute(sp(`order_id=${ORDER_UUID}`));
    expect(route.kind).toBe('order_confirmation');
  });

  it('empty URL → OrderConfirmation (will show its empty-state)', () => {
    const route = classifyOrderConfirmationRoute(sp(''));
    expect(route.kind).toBe('order_confirmation');
  });

  it('unrelated params pass through as OrderConfirmation', () => {
    const route = classifyOrderConfirmationRoute(sp(`utm_source=email`));
    expect(route.kind).toBe('order_confirmation');
  });
});

describe('classifyOrderConfirmationRoute — legacy shapes are canonicalized', () => {
  it('legacy ?order=<uuid> → canonicalize to ?order_id=<uuid>', () => {
    const route = classifyOrderConfirmationRoute(sp(`order=${ORDER_UUID}`));
    expect(route.kind).toBe('canonicalize');
    if (route.kind !== 'canonicalize') throw new Error('type narrowing');
    const next = new URLSearchParams(route.nextSearch);
    expect(next.get('order_id')).toBe(ORDER_UUID);
    expect(next.get('order')).toBeNull();
  });

  it('mis-encoded UUID in session_id → canonicalize to ?order_id=<uuid>', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`session_id=${ORDER_UUID}`)
    );
    expect(route.kind).toBe('canonicalize');
    if (route.kind !== 'canonicalize') throw new Error('type narrowing');
    const next = new URLSearchParams(route.nextSearch);
    expect(next.get('order_id')).toBe(ORDER_UUID);
    expect(next.get('session_id')).toBeNull();
  });

  it('canonicalization preserves unrelated params (utm, locale, ...)', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`order=${ORDER_UUID}&utm_source=newsletter&lang=fr`)
    );
    expect(route.kind).toBe('canonicalize');
    if (route.kind !== 'canonicalize') throw new Error('type narrowing');
    const next = new URLSearchParams(route.nextSearch);
    expect(next.get('order_id')).toBe(ORDER_UUID);
    expect(next.get('utm_source')).toBe('newsletter');
    expect(next.get('lang')).toBe('fr');
  });

  it('canonicalization drops the old key but keeps other search entries in order', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`a=1&order=${ORDER_UUID}&b=2`)
    );
    expect(route.kind).toBe('canonicalize');
    if (route.kind !== 'canonicalize') throw new Error('type narrowing');
    const keys = Array.from(new URLSearchParams(route.nextSearch).keys());
    expect(keys[0]).toBe('order_id'); // canonical key emitted first
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(keys).not.toContain('order');
  });

  it('legacy ?order is ignored when fresh Stripe return is also present', () => {
    // Edge case: if both `order=<uuid>` and `session_id=cs_...` are set,
    // the fresh Stripe return wins (the customer JUST paid).
    const route = classifyOrderConfirmationRoute(
      sp(`order=${ORDER_UUID}&session_id=cs_abc`)
    );
    expect(route.kind).toBe('payment_success');
  });
});

describe('classifyOrderConfirmationRoute — adversarial inputs', () => {
  it('non-UUID value in order_id is not treated as canonical', () => {
    // It's not a fresh return and not a valid canonical key, so we fall
    // through to OrderConfirmation which handles the empty state.
    const route = classifyOrderConfirmationRoute(
      sp(`order_id=drop-table-orders`)
    );
    expect(route.kind).toBe('order_confirmation');
  });

  it('non-UUID value in ?order is not canonicalized', () => {
    const route = classifyOrderConfirmationRoute(
      sp(`order=<script>alert(1)</script>`)
    );
    expect(route.kind).toBe('order_confirmation');
  });

  it('cs_* prefix without further content still counts as a Stripe return', () => {
    // We intentionally do NOT validate the Stripe session id shape here —
    // that's PaymentSuccess's job (it hits order-lookup which validates).
    // The classifier's contract is "the URL has the *signal* of a fresh
    // return" and cs_* is that signal.
    const route = classifyOrderConfirmationRoute(sp(`session_id=cs_`));
    expect(route.kind).toBe('payment_success');
  });

  it('different UUIDs in order_id and session_id do not cross-pollinate', () => {
    // Belt-and-braces: make sure classifyOrderConfirmationRoute doesn't
    // silently prefer one UUID over another — a canonical order_id wins
    // over a UUID-shaped session_id when there's no cs_* prefix.
    const route = classifyOrderConfirmationRoute(
      sp(`order_id=${ORDER_UUID}&session_id=${OTHER_UUID}`)
    );
    expect(route.kind).toBe('order_confirmation');
  });
});
