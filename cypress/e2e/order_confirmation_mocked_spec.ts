/**
 * Order confirmation with Edge Function mocks (token flow only — no REST/v1).
 *
 * Tags: @regression
 */

const ORDER_ID = '11111111-2222-3333-4444-555555555555';
const ORDER_CONFIRM_MOCK_TOKEN = 'e2e-dummy-payload.e2e-dummy-signature';

const orderConfirmMockOrder = {
  id: ORDER_ID,
  status: 'paid',
  order_status: 'processing',
  amount: 4200,
  currency: 'eur',
  created_at: new Date().toISOString(),
  shipping_address: {
    first_name: 'E2E',
    last_name: 'User',
    email: 'e2e@example.com',
    address_line1: '1 rue Test',
    postal_code: '75001',
    city: 'Paris',
    country: 'FR',
  },
  metadata: {
    customer_email: 'e2e@example.com',
    payment_method_label: 'Carte bancaire',
  },
  payment_method: 'card',
  user_id: null,
  pricing_snapshot: null,
  subtotal_amount: 4200,
  discount_amount: 0,
  shipping_amount: 0,
  total_amount: 4200,
};

const orderConfirmMockItem = {
  quantity: 1,
  unit_price: 4200,
  total_price: 4200,
  product_snapshot: { name: 'Test Product', images: [] },
  product_id: 1,
};

describe('Order confirmation (edge mocked) @regression', () => {
  it('shows confirmation when sign-order-token and get-order-by-token succeed', () => {
    cy.intercept('POST', /\/functions\/v1\/reconcile-payment/, {
      statusCode: 200,
      body: { ok: true },
    });

    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, {
      statusCode: 200,
      body: { token: ORDER_CONFIRM_MOCK_TOKEN },
    }).as('signOrderToken');

    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, (req) => {
      expect(req.body).to.have.property('token', ORDER_CONFIRM_MOCK_TOKEN);
      req.reply({
        statusCode: 200,
        body: { order: orderConfirmMockOrder, items: [orderConfirmMockItem] },
      });
    }).as('getOrderByToken');

    cy.visit(`/order-confirmation?order_id=${encodeURIComponent(ORDER_ID)}`);

    cy.wait('@signOrderToken', { timeout: 20000 });
    cy.wait('@getOrderByToken', { timeout: 20000 });

    cy.contains(/Paiement confirmé/i, { timeout: 15000 }).should('be.visible');
    cy.contains('Test Product').should('be.visible');
  });

  it('legacy path /order-confirmation/:orderId replaces with ?order_id= (canonical URL)', () => {
    cy.intercept('POST', /\/functions\/v1\/reconcile-payment/, {
      statusCode: 200,
      body: { ok: true },
    });
    cy.intercept('POST', /\/functions\/v1\/sign-order-token/, {
      statusCode: 200,
      body: { token: ORDER_CONFIRM_MOCK_TOKEN },
    });
    cy.intercept('POST', /\/functions\/v1\/get-order-by-token/, {
      statusCode: 200,
      body: { order: orderConfirmMockOrder, items: [orderConfirmMockItem] },
    });

    cy.visit(`/order-confirmation/${ORDER_ID}`);

    cy.url({ timeout: 15000 }).should('include', '/order-confirmation');
    cy.url().should('include', `order_id=${encodeURIComponent(ORDER_ID)}`);
    cy.url().should('not.match', /\/order-confirmation\/[0-9a-f-]{36}/i);

    cy.contains(/Paiement confirmé/i, { timeout: 15000 }).should('be.visible');
  });
});
