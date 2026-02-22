import 'cypress-axe';
import './commands';

import { register as registerCypressGrep } from '@cypress/grep';
registerCypressGrep();

Cypress.on('uncaught:exception', (err) => {
  const message = err?.message ?? '';
  if (message.includes('ResizeObserver loop limit exceeded')) return false;
  return true;
});

beforeEach(() => {
  cy.clearCookies();
  cy.clearLocalStorage();
});
