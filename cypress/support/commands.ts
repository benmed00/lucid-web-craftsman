import type { Method } from "cypress/types/net-stubbing";

type MockScenario =
  | "success"
  | "error400"
  | "error401"
  | "error403"
  | "error404"
  | "error500"
  | "errorTimeout"
  | "invalidPayload"
  | "latency";

Cypress.Commands.add("addProductToCart", (options?: { productId?: number }) => {
  cy.visit("/products");
  const id = options?.productId;
  if (id != null) {
    cy.get(`#add-to-cart-btn-${id}`).should("be.visible").click();
    return;
  }
  cy.get('[id^="add-to-cart-btn-"]').first().should("be.visible").click();
});

Cypress.Commands.add("resetDatabase", () => {
  const url = Cypress.env("DB_RESET_URL") as string | undefined;
  const token = Cypress.env("DB_RESET_TOKEN") as string | undefined;
  if (!url) {
    cy.clearCookies();
    cy.clearLocalStorage();
    return;
  }
  cy.request({
    method: "POST",
    url,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    failOnStatusCode: true
  });
});

Cypress.Commands.add("mockSupabaseResponse", (method: Method, path: string, scenario: MockScenario, body?: unknown) => {
  const toGlob = (p: string) => {
    if (p === "/products") return "**/rest/v1/products*";
    if (p === "/product_translations") return "**/rest/v1/product_translations*";
    if (p === "/orders") return "**/rest/v1/orders*";
    if (p === "/profiles") return "**/rest/v1/profiles*";
    if (p === "/app_settings") return "**/rest/v1/app_settings*";
    if (p.startsWith("/rpc/")) return `**/rest/v1${p}*`;
    if (p.startsWith("/functions/")) return `**${p}*`;
    return `**${p}*`;
  };

  const reply = () => {
    switch (scenario) {
      case "success":
        return { statusCode: 200, body };
      case "invalidPayload":
        return { statusCode: 200, body: { invalid: true } };
      case "error400":
        return { statusCode: 400, body: { message: "Bad Request (mocked)" } };
      case "error401":
        return { statusCode: 401, body: { message: "Unauthorized (mocked)" } };
      case "error403":
        return { statusCode: 403, body: { message: "Forbidden (mocked)" } };
      case "error404":
        return { statusCode: 404, body: { message: "Not Found (mocked)" } };
      case "error500":
        return { statusCode: 500, body: { message: "Server Error (mocked)" } };
      case "latency":
        return { statusCode: 200, body, delayMs: 1500 };
      case "errorTimeout":
        return { forceNetworkError: true as const };
    }
  };

  cy.intercept(method, toGlob(path), (req) => {
    req.reply(reply() as Cypress.StaticResponse);
  }).as(`mock:${method}:${path}:${scenario}`);
});

declare global {
  /* eslint-disable @typescript-eslint/no-namespace -- Cypress Chainable augmentation requires namespace */
  namespace Cypress {
    interface Chainable {
      addProductToCart(options?: { productId?: number }): Chainable<void>;
      resetDatabase(): Chainable<void>;
      mockSupabaseResponse(method: Method, path: string, scenario: MockScenario, body?: unknown): Chainable<void>;
    }
  }
}
