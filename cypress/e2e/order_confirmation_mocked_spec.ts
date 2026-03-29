/**
 * Order confirmation page with mocked DB lookup (no Stripe).
 * Uses the new /order-confirmation?order_id=... route.
 *
 * Tags: @regression
 */

describe('Order confirmation (mocked DB) @regression', () => {
  it('shows confirmation when order is found and paid', () => {
    const orderId = 'e2e-mock-order-id';

    // Intercept the Supabase REST query for orders
    cy.intercept('GET', /\/rest\/v1\/orders\?.*id.*eq.*e2e-mock-order-id/, {
      statusCode: 200,
      body: [{
        id: orderId,
        status: 'paid',
        order_status: 'paid',
        amount: 4200,
        currency: 'EUR',
        created_at: new Date().toISOString(),
        shipping_address: null,
        metadata: {},
        payment_method: 'card',
        user_id: null,
      }],
    }).as('orderLookup');

    // Intercept order_items
    cy.intercept('GET', /\/rest\/v1\/order_items\?.*order_id.*eq.*e2e-mock-order-id/, {
      statusCode: 200,
      body: [{
        quantity: 1,
        unit_price: 4200,
        total_price: 4200,
        product_snapshot: { name: 'Test Product', images: [] },
      }],
    }).as('orderItems');

    cy.visit(`/order-confirmation?order_id=${orderId}`);

    cy.contains(/Paiement confirmé|Payment confirmed/i, {
      timeout: 25000,
    }).should('be.visible');

    cy.contains('Test Product').should('be.visible');
  });
});
