/**
 * Records HTTP 4xx/5xx seen during each test; flushes to Cypress tasks on failure
 * so Node can write cypress/diagnostics/http-failures.json in after:run.
 *
 * Support is loaded once per Cypress run; guard ensures a single middleware intercept.
 */
const failuresThisTest: { url: string; status: number }[] = [];
let networkCaptureInitialized = false;

beforeEach(() => {
  failuresThisTest.length = 0;
  if (!networkCaptureInitialized) {
    networkCaptureInitialized = true;
    cy.intercept({ middleware: true, url: '**/*' }, (req) => {
      req.on('response', (res) => {
        if (res.statusCode >= 400) {
          failuresThisTest.push({
            url: req.url,
            status: res.statusCode,
          });
        }
      });
    });
  }
});

afterEach(function () {
  const state = this.currentTest?.state;
  if (state === 'failed' && failuresThisTest.length > 0) {
    cy.task(
      'recordHttpFailures',
      failuresThisTest.map((r) => ({ ...r })),
      { log: false }
    );
  }
});
