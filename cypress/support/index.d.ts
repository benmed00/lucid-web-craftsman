/// <reference types="cypress" />
/// <reference types="cypress-axe" />

declare global {
  namespace Cypress {
    interface Chainable {
      addProductToCart(options?: { productId?: number }): Chainable<void>;
      resetDatabase(): Chainable<void>;
      mockSupabaseResponse(
        method: import("cypress/types/net-stubbing").Method,
        path: string,
        scenario:
          | "success"
          | "error400"
          | "error401"
          | "error403"
          | "error404"
          | "error500"
          | "errorTimeout"
          | "invalidPayload"
          | "latency",
        body?: unknown
      ): Chainable<void>;
    }
  }
}

export {};
