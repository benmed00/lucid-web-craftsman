/**
 * Payment success page with mocked Edge Functions (no Stripe).
 * Intercepts order-lookup so verification completes without a real session.
 *
 * Tags: @regression
 */

describe('Payment success (mocked verification) @regression', () => {
  it('shows confirmation when order-lookup returns a paid order', () => {
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

    const sessionId = 'cs_test_e2e_mock_session';
    cy.visit(`/payment-success?session_id=${encodeURIComponent(sessionId)}`);

    // First successful lookup may follow a short loading state; page can poll up to ~10s
    cy.wait('@orderLookup', { timeout: 35000 });
    cy.contains(/Paiement Réussi|Payment successful/i, {
      timeout: 25000,
    }).should('be.visible');
  });
});
