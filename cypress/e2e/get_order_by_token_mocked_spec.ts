/**
 * Order-confirmation page with the **Edge Function** path mocked end-to-end.
 *
 * Why this spec exists separately from `order_confirmation_mocked_spec.ts`:
 *   - Both specs use the token pipeline only (no browser REST on `orders` /
 *     `order_items`). This file adds scenarios for 409 retry and auth failure.
 *   - Stubs: `reconcile-payment`, `sign-order-token`, `get-order-by-token`.
 *
 * Covered scenarios:
 *   1. Happy path — token issued, order fetched, confirmation UI renders.
 *   2. `sign-order-token` returns 409 twice then 200 → success after controlled retry.
 *   3. `sign-order-token` returns 409 on all attempts → hard error.
 *   4. `get-order-by-token` → 401 → error state (contract check).
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

  it('sign-order-token: two 409 then 200 succeeds (max two retries)', () => {
    let calls = 0;
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, (req) => {
      calls += 1;
      if (calls <= 2) {
        req.reply({ statusCode: 409, body: { error: 'Order not ready' } });
        return;
      }
      req.reply({ statusCode: 200, body: { token: FAKE_TOKEN } });
    }).as('signOrderTokenRetry');

    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, (req) => {
      expect(req.body).to.have.property('token', FAKE_TOKEN);
      req.reply({
        statusCode: 200,
        body: { order: fakeOrder(ORDER_ID_RETRY), items: [fakeItem] },
      });
    }).as('getOrderAfterRetry');

    visit(ORDER_ID_RETRY);

    cy.wait('@signOrderTokenRetry', { timeout: 20000 });
    cy.wait('@signOrderTokenRetry');
    cy.wait('@signOrderTokenRetry');
    cy.wait('@getOrderAfterRetry', { timeout: 20000 });

    cy.contains(/Paiement confirmé/i, { timeout: 15000 }).should('be.visible');
    cy.contains('Article E2E').should('be.visible');
  });

  it('error: sign-order-token returns 409 on every attempt → hard error', () => {
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, {
      statusCode: 409,
      body: { error: 'Order not ready' },
    }).as('signOrderToken409');

    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, (req) => {
      req.reply({
        statusCode: 200,
        body: { order: fakeOrder(ORDER_ID_RETRY), items: [fakeItem] },
      });
    }).as('getOrderByTokenShouldNotRun');

    visit(ORDER_ID_RETRY);

    cy.wait('@signOrderToken409', { timeout: 20000 });
    cy.wait('@signOrderToken409');
    cy.wait('@signOrderToken409');

    cy.contains(/Impossible d'afficher la commande/i, {
      timeout: 15000,
    }).should('be.visible');
    cy.contains(/Paiement confirmé/i, { timeout: 2000 }).should('not.exist');
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

    cy.wait('@getOrderByTokenFail', { timeout: 30000 });

    cy.contains(/Impossible d'afficher la commande/i, {
      timeout: 10000,
    }).should('be.visible');
    cy.contains(/Paiement confirmé/i, { timeout: 3000 }).should('not.exist');
  });
});
