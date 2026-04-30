import 'cypress-axe';
import 'cypress-real-events';
import './commands';
import './networkFailureCapture';

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
