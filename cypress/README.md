# Cypress Tests for Rif Raw Fashion

This directory contains the end-to-end tests for the Rif Raw Fashion application, written using Cypress.

## Prerequisites

1.  **Node.js and Yarn/NPM:** Ensure you have Node.js installed. This project uses Yarn for package management, but NPM can also be used.
2.  **Project Dependencies:** Install the project dependencies by running `yarn install` or `npm install` in the root directory of the project. This will also install Cypress and its dependencies as defined in `package.json`.

## Running the Tests

You can run the Cypress tests using the scripts defined in the project's `package.json` file:

*   **To open the Cypress Test Runner (interactive mode):**
    ```bash
    yarn cypress:open
    ```
    or
    ```bash
    npm run cypress:open
    ```
    This is recommended for writing and debugging tests.

*   **To run all tests headlessly (e.g., for CI environments):**
    ```bash
    yarn cypress:run
    ```
    or
    ```bash
    npm run cypress:run
    ```

## Test Structure

The tests are organized into spec files within the `cypress/e2e/` directory. Each spec file typically covers a specific page, feature, or user flow:

*   **`basic_navigation.cy.js`**: Tests basic navigation to key pages (Homepage, Products, Cart, Blog, About, Contact) and ensures they load correctly.
*   **`button_interactions.cy.js`**: Tests various button clicks and interactions, including navigation buttons, homepage CTAs, and the "Add to Cart" functionality.
*   **`image_loading.cy.js`**: Verifies that critical images (hero images, product images) load correctly and have appropriate attributes.
*   **`redirection.cy.js`**: Tests redirection logic, currently focusing on ensuring non-existent routes display the 404 page.
*   **`api_data_handling.cy.js`**: Tests how the application UI handles different data scenarios from the (mocked) API service for products and blog posts. This includes successful data loading, empty responses, and error states.
*   **`form_submissions.cy.js`**: Tests form interactions for the newsletter subscription, contact forms (Message and Commande), and the multi-step checkout process. It focuses on UI validation and successful progression through form steps.

## Test Configuration

*   The main Cypress configuration is in `cypress.config.js`.
*   The `baseUrl` is set to `http://localhost:5173` (the typical Vite development server port for this project).
*   Custom commands (if any) would be in `cypress/support/commands.js`.
*   Fixtures (if any) would be in `cypress/fixtures/`.

## Further Information

For more general information about Cypress, visit the official [Cypress documentation](https://docs.cypress.io).
