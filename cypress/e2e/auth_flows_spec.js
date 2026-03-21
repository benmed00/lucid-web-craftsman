/**
 * Auth Flows E2E — Sign in, Sign up, Password reset
 *
 * Uses cy.loginAs() via cy.session() so session is cached across tests.
 * Requires env vars: CUSTOMER_EMAIL, CUSTOMER_PASSWORD
 *
 * Tags: @auth @smoke @regression
 */

const AUTH_URL = '/auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fillSignInForm(email, password) {
  cy.get('#signin-email').clear().type(email);
  cy.get('#signin-password').clear().type(password, { log: false });
}

function fillSignUpForm(email, password, fullName) {
  cy.get('#signup-fullname, [name="fullName"], [placeholder*="nom" i]')
    .first()
    .clear()
    .type(fullName);
  cy.get('#signup-email, [name="email"][id*="sign" i]')
    .first()
    .clear()
    .type(email);
  cy.get('#signup-password, [name="password"][id*="sign" i]')
    .first()
    .clear()
    .type(password, { log: false });
}

// ── Sign-In Tests ─────────────────────────────────────────────────────────────

describe('Auth: Sign In @auth @smoke', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
  });

  it('renders the sign-in form with required fields', () => {
    cy.get('#signin-email').should('be.visible');
    cy.get('#signin-password').should('be.visible');
    cy.get('button[type="submit"]')
      .contains(/se connecter|sign in/i)
      .should('be.visible');
  });

  it('shows validation error for empty email submission', () => {
    cy.get('#signin-password').type('somepassword');
    cy.get('button[type="submit"]')
      .contains(/se connecter|sign in/i)
      .click();
    // Either HTML5 validation or custom error
    cy.get(
      '#signin-email:invalid, [data-testid="email-error"], [role="alert"]'
    ).should('exist');
  });

  it('shows error for incorrect credentials', () => {
    fillSignInForm('not-a-real-user@example.com', 'WrongPassword123!');
    cy.get('button[type="submit"]')
      .contains(/se connecter|sign in/i)
      .click();
    cy.contains(
      /mot de passe incorrect|invalid|identifiants|connexion échouée|email ou mot de passe/i,
      { timeout: 8000 }
    ).should('be.visible');
  });

  it('password field masks input', () => {
    cy.get('#signin-password').should('have.attr', 'type', 'password');
  });

  it('has a link to sign-up / create account', () => {
    cy.contains(/créer un compte|s'inscrire|register|sign up/i).should(
      'be.visible'
    );
  });

  it('has a link to reset password', () => {
    cy.contains(/mot de passe oublié|forgot|réinitialiser/i).should(
      'be.visible'
    );
  });

  it('navigates to the app after successful sign-in', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    const password = Cypress.env('CUSTOMER_PASSWORD');

    if (!email || !password) {
      cy.log('Skipping: CUSTOMER_EMAIL / CUSTOMER_PASSWORD not set');
      return;
    }

    fillSignInForm(email, password);
    cy.get('button[type="submit"]')
      .contains(/se connecter|sign in/i)
      .click();

    cy.url({ timeout: 10000 }).should('not.include', '/auth');
  });
});

// ── Sign-Up Tests ─────────────────────────────────────────────────────────────

describe('Auth: Sign Up @auth @regression', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
    // Switch to sign-up tab/section
    cy.contains(/créer un compte|s'inscrire|register|sign up/i).click();
  });

  it('renders the sign-up form', () => {
    cy.contains(/créer un compte|s'inscrire|register/i).should('be.visible');
  });

  it('shows validation error for mismatched passwords', () => {
    const timestamp = Date.now();
    fillSignUpForm(
      `test-${timestamp}@example.com`,
      'ValidPass123!',
      'Test User'
    );

    // If there's a password-confirm field, fill it with a different value
    cy.get(
      '#signup-confirm, [name="confirmPassword"], [placeholder*="confirmer" i]'
    )
      .first()
      .then(($el) => {
        if ($el.length) {
          cy.wrap($el).clear().type('DifferentPass456!', { log: false });
          cy.get('button[type="submit"]')
            .contains(/s'inscrire|créer|create|register/i)
            .click();
          cy.contains(
            /mot de passe|password|ne correspondent pas|mismatch/i
          ).should('be.visible');
        } else {
          cy.log('No confirm-password field found; skipping mismatch test');
        }
      });
  });

  it('shows validation error for invalid email format', () => {
    fillSignUpForm('not-an-email', 'ValidPass123!', 'Test User');
    cy.get('button[type="submit"]')
      .contains(/s'inscrire|créer|create|register/i)
      .click();
    cy.get(
      '[id*="email"]:invalid, [data-testid="email-error"], [role="alert"]'
    ).should('exist');
  });

  it('shows error for already-registered email', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    if (!email) {
      cy.log('Skipping: CUSTOMER_EMAIL not set');
      return;
    }

    fillSignUpForm(email, 'ValidPass123!', 'Test User');
    cy.get('button[type="submit"]')
      .contains(/s'inscrire|créer|create|register/i)
      .click();

    cy.contains(/déjà utilisé|already|exists|email exist|utilisé/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('page title or heading indicates the sign-up section', () => {
    cy.contains(
      /créer un compte|créer votre compte|inscription|register/i
    ).should('be.visible');
  });
});

// ── Password Reset Tests ──────────────────────────────────────────────────────

describe('Auth: Password Reset @auth @regression', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
    cy.contains(/mot de passe oublié|forgot|réinitialiser/i).click();
  });

  it('shows a reset password form with an email field', () => {
    cy.get(
      'input[type="email"], input[id*="reset"], input[id*="email"]'
    ).should('be.visible');
  });

  it('shows success feedback after submitting a valid email', () => {
    const email = Cypress.env('CUSTOMER_EMAIL') || 'test@example.com';

    cy.get('input[type="email"]').first().clear().type(email);
    cy.get('button[type="submit"]')
      .contains(/envoyer|send|réinitialiser|reset/i)
      .click();

    cy.contains(
      /email envoyé|lien envoyé|check your email|vérifiez votre|sent/i,
      { timeout: 8000 }
    ).should('be.visible');
  });

  it('shows error for invalid email format', () => {
    cy.get('input[type="email"]').first().clear().type('not-valid');
    cy.get('button[type="submit"]')
      .contains(/envoyer|send|réinitialiser|reset/i)
      .click();

    cy.get(
      'input[type="email"]:invalid, [role="alert"], [data-testid*="error"]'
    ).should('exist');
  });

  it('has a link to go back to sign-in', () => {
    cy.contains(/retour|back|connexion|se connecter/i).should('be.visible');
  });
});

// ── Protected Route Redirect ──────────────────────────────────────────────────

describe('Auth: Protected Routes @auth @smoke', () => {
  it('redirects unauthenticated users from /profile to /auth', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/profile');
    cy.url({ timeout: 6000 }).should('include', '/auth');
  });

  it('shows login required on /orders when unauthenticated (stays on /orders)', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/orders');
    cy.url().should('include', '/orders');
    cy.contains(/Se connecter|sign in|connexion|login required/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('authenticated user can reach /profile without redirect', () => {
    const email = Cypress.env('CUSTOMER_EMAIL');
    const password = Cypress.env('CUSTOMER_PASSWORD');
    if (!email || !password) {
      cy.log('Skipping: credentials not set');
      return;
    }
    cy.loginAs('customer');
    cy.visit('/profile');
    cy.url().should('not.include', '/auth');
  });
});
