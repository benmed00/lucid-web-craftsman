/**
 * Maintenance mode is driven by app_settings.display_settings (see useMaintenanceMode).
 * The hook defers the fetch by ~2s — allow time for the maintenance screen.
 *
 * Tags: @regression
 */

describe('Maintenance mode @regression', () => {
  beforeEach(() => {
    // PostgREST typically returns a JSON array of rows; supabase-js normalizes to a single row for maybeSingle()
    cy.intercept('GET', '**/rest/v1/app_settings*', {
      statusCode: 200,
      body: [
        {
          setting_key: 'display_settings',
          setting_value: {
            maintenanceMode: true,
            maintenanceMessage: 'E2E: plateforme en maintenance.',
          },
        },
      ],
    }).as('appSettingsMaintenance');
  });

  it('shows the maintenance page on the homepage', () => {
    cy.visit('/');
    cy.contains('h1', 'Site en maintenance', { timeout: 15000 }).should(
      'be.visible'
    );
    cy.contains('E2E: plateforme en maintenance.').should('be.visible');
  });

  it('shows the maintenance page on /products', () => {
    cy.visit('/products');
    cy.contains('h1', 'Site en maintenance', { timeout: 15000 }).should(
      'be.visible'
    );
  });
});
