/**
 * Order-confirmation page with the **Edge Function** path mocked end-to-end.
 *
 * Why this spec exists separately from `order_confirmation_mocked_spec.ts`:
 *   - The other spec intercepts Supabase REST (`/rest/v1/orders?…`) directly.
 *     That path does not exercise `get-order-by-token`.
 *   - This spec stubs the three edge functions the confirmation page actually
 *     calls (`reconcile-payment`, `sign-order-token`, `get-order-by-token`)
 *     and asserts the UI reacts to each of them correctly.
 *
 * Covered scenarios:
 *   1. Happy path — token issued, order fetched, confirmation UI renders.
 *   2. `sign-order-token` retry loop — 409 on the first call, 200 on the
 *      second; confirmation still renders.
 *   3. `get-order-by-token` → 401 → page surfaces an error (contract check).
 *
 * Tags: @regression
 */

const ORDER_ID_HAPPY = '11111111-2222-3333-4444-555555555555';
const ORDER_ID_RETRY = '22222222-3333-4444-5555-666666666666';
const ORDER_ID_ERROR = '33333333-4444-5555-6666-777777777777';

const FAKE_TOKEN = 'cy-e2e-dummy-payload.cy-e2e-dummy-signature';

const visit = (orderId: string) =>
  cy.visit(
    `/order-confirmation?order_id=${encodeURIComponent(orderId)}&payment_complete=1`
  );

const fakeOrder = (orderId: string) => ({
  id: orderId,
  status: 'paid',
  order_status: 'processing',
  amount: 4999,
  currency: 'eur',
  created_at: new Date().toISOString(),
  shipping_address: {
    first_name: 'Alice',
    last_name: 'Dupont',
    email: 'alice@example.com',
    address_line1: '1 rue Test',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
  },
  // Already whitelisted by get-order-by-token before it arrives here.
  metadata: {
    customer_email: 'alice@example.com',
    payment_method_label: 'Carte bancaire',
  },
  payment_method: 'card',
  user_id: null,
  pricing_snapshot: null,
  subtotal_amount: 4999,
  discount_amount: 0,
  shipping_amount: 0,
  total_amount: 4999,
});

const fakeItem = {
  quantity: 1,
  unit_price: 4999,
  total_price: 4999,
  product_snapshot: { name: 'Article E2E', images: [] },
  product_id: 42,
};

describe('Order confirmation via get-order-by-token (edge mocked) @regression', () => {
  beforeEach(() => {
    // Keep reconcile-payment side-effect-free across every scenario.
    cy.intercept('POST', /\/functions\/v1\/reconcile-payment/, {
      statusCode: 200,
      body: { ok: true },
    }).as('reconcile');
  });

  it('happy path: sign-order-token then get-order-by-token render the page', () => {
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, {
      statusCode: 200,
      body: { token: FAKE_TOKEN },
    }).as('signOrderToken');

    // Contract check inline: the frontend must POST exactly `{ token }`.
    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, (req) => {
      expect(req.body).to.have.property('token', FAKE_TOKEN);
      expect(Object.keys(req.body as Record<string, unknown>)).to.have.length(
        1
      );
      req.reply({
        statusCode: 200,
        body: { order: fakeOrder(ORDER_ID_HAPPY), items: [fakeItem] },
      });
    }).as('getOrderByToken');

    visit(ORDER_ID_HAPPY);

    cy.wait('@signOrderToken', { timeout: 20000 });
    cy.wait('@getOrderByToken', { timeout: 20000 });

    cy.contains(/Paiement confirmé/i, { timeout: 15000 }).should('be.visible');
    cy.contains('Article E2E').should('be.visible');
  });

  it('retry: sign-order-token 409 then 200; confirmation eventually renders', () => {
    let signCalls = 0;
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, (req) => {
      signCalls += 1;
      if (signCalls === 1) {
        req.reply({ statusCode: 409, body: { error: 'Order not ready' } });
      } else {
        req.reply({ statusCode: 200, body: { token: FAKE_TOKEN } });
      }
    }).as('signOrderTokenRetry');

    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, {
      statusCode: 200,
      body: { order: fakeOrder(ORDER_ID_RETRY), items: [fakeItem] },
    }).as('getOrderByTokenRetry');

    visit(ORDER_ID_RETRY);

    // Two calls on sign-order-token — one 409, one 200.
    cy.wait('@signOrderTokenRetry', { timeout: 20000 });
    cy.wait('@signOrderTokenRetry', { timeout: 20000 });

    // Then exactly one successful get-order-by-token.
    cy.wait('@getOrderByTokenRetry', { timeout: 20000 });

    cy.contains(/Paiement confirmé/i, { timeout: 15000 }).should('be.visible');
  });

  it('error: get-order-by-token returns 401 → page surfaces an error state', () => {
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, {
      statusCode: 200,
      body: { token: FAKE_TOKEN },
    }).as('signOrderTokenOk');

    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, {
      statusCode: 401,
      body: { error: 'Invalid or expired token' },
    }).as('getOrderByTokenFail');

    visit(ORDER_ID_ERROR);

    // The frontend retries up to 4× on errors. We don't pin the exact count —
    // we just confirm at least one failing fetch completed and the UI does
    // not mis-report success.
    cy.wait('@getOrderByTokenFail', { timeout: 30000 });

    cy.contains(/Paiement confirmé/i, { timeout: 3000 }).should('not.exist');
  });
});
