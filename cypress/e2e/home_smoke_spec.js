/**
 * Home smoke: the main page renders in the preview environment without major
 * network failures (no 5xx from same-origin resources, no failed navigations).
 *
 * "Major" = 5xx server errors on same-origin requests OR the document itself
 * failing. 4xx on optional analytics/marketing pixels is tolerated; those are
 * best-effort and out of scope for a smoke.
 *
 * Tags: @smoke @regression
 */

const IGNORED_HOSTS = [
  'facebook.net',
  'facebook.com',
  'analytics.tiktok.com',
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'sentry.io',
  'ingest.sentry.io',
];

const isIgnoredHost = (url) => {
  try {
    const host = new URL(url).host;
    return IGNORED_HOSTS.some((h) => host.endsWith(h));
  } catch {
    return false;
  }
};

describe('Home page — smoke @smoke @regression', () => {
  const failures = [];
  const uncaught = [];

  beforeEach(() => {
    failures.length = 0;
    uncaught.length = 0;

    // Track uncaught exceptions but do not fail the test on optional
    // third-party breakage; we assert on the collected list at the end.
    Cypress.on('uncaught:exception', (err) => {
      uncaught.push(err.message);
      return false;
    });

    // Intercept every response and record same-origin 5xx as a major failure.
    cy.intercept('**/*', (req) => {
      req.on('response', (res) => {
        const url = req.url;
        if (isIgnoredHost(url)) return;
        if (res.statusCode >= 500) {
          failures.push({ url, status: res.statusCode });
        }
      });
    });
  });

  it('loads / and renders the main shell without 5xx or fatal script errors', () => {
    cy.visit('/', { failOnStatusCode: true });

    // Basic structural checks — main shell rendered
    cy.get('header, [role="banner"]', { timeout: 20000 }).should('exist');
    cy.get('main, [role="main"]', { timeout: 20000 }).should('exist');
    cy.get('body').should('be.visible').and('not.be.empty');
    cy.title().should('not.be.empty').and('not.match', /lovable generated project|lovable app/i);

    // Give lazy chunks / hydration a moment to flush any deferred network errors
    cy.wait(500);

    cy.then(() => {
      const critical = failures.filter((f) => f.status >= 500);
      expect(
        critical,
        `expected no 5xx failures on same-origin requests, got: ${JSON.stringify(critical, null, 2)}`
      ).to.have.length(0);

      const fatal = uncaught.filter(
        (m) => !/ResizeObserver|third-party|facebook|tiktok|analytics/i.test(m)
      );
      expect(
        fatal,
        `expected no fatal uncaught script errors, got: ${JSON.stringify(fatal, null, 2)}`
      ).to.have.length(0);
    });
  });
});
