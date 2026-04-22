/**
 * Payment success page with mocked Edge Functions (no Stripe).
 * Intercepts order-lookup (by order_id) so confirmation completes without Stripe.
 *
 * Tags: @regression
 */

describe('Payment success (mocked verification) @regression', () => {
  it('shows confirmation when order-lookup returns a paid order immediately', () => {
    const lookupBody = {
      found: true,
      is_paid: true,
      order_id: 'e2e-mock-order-id',
      amount: 42,
      currency: 'EUR',
    };
    // Must match Supabase JS: POST {VITE_SUPABASE_URL}/functions/v1/order-lookup
    // (see PaymentSuccess.tsx lookupOrder → supabase.functions.invoke('order-lookup'))
    cy.intercept('POST', /\/functions\/v1\/order-lookup/, {
      statusCode: 200,
      body: lookupBody,
    }).as('orderLookup');

    const orderId = '11111111-2222-3333-4444-555555555555';
    cy.visit(
      `/order-confirmation?order_id=${encodeURIComponent(orderId)}&payment_complete=1`
    );

    // First successful lookup may follow a short loading state; page can poll up to ~10s
    cy.wait('@orderLookup', { timeout: 35000 });
    cy.contains(/Paiement Réussi|Payment successful/i, {
      timeout: 25000,
    }).should('be.visible');
  });

  it('shows confirmation after order-lookup: pending then paid (poll path)', () => {
    let lookupCalls = 0;
    cy.intercept('POST', /\/functions\/v1\/order-lookup/, (req) => {
      lookupCalls += 1;
      if (lookupCalls === 1) {
        req.reply({
          statusCode: 200,
          body: {
            found: true,
            is_paid: false,
            order_id: 'e2e-pending-order',
          },
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            found: true,
            is_paid: true,
            order_id: 'e2e-after-poll-order',
            amount: 99,
            currency: 'EUR',
          },
        });
      }
    }).as('orderLookupPoll');

    const orderId = '22222222-3333-4444-5555-666666666666';
    cy.visit(
      `/order-confirmation?order_id=${encodeURIComponent(orderId)}&payment_complete=1`
    );

    // First lookup is immediate; poll uses 2s interval before the second lookup
    cy.wait('@orderLookupPoll', { timeout: 35000 });
    cy.contains(/Paiement Réussi|Payment successful/i, {
      timeout: 35000,
    }).should('be.visible');
  });
});
