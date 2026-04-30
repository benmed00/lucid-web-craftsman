/**
 * Auth Flows E2E — Sign in, Sign up, Password reset
 *
 * Uses cy.loginAs() via cy.session() so session is cached across tests.
 * Requires env vars: CUSTOMER_EMAIL, CUSTOMER_PASSWORD
 *
 * Selectors (see src/pages/Auth.tsx): **prefer `[data-testid="auth-*"]`** on the main
 * form (`auth-form`, `auth-submit`, `auth-toggle-signup`). Legacy `#signin-*` / `#signup-*`
 * remain as fallbacks for older deployments.
 *
 * Tags: @auth @smoke @regression
 */

const AUTH_URL = '/auth';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Primary form anchor — avoids resolving the wrong form when a duplicate exists (e.g. mobile menu). */
const AUTH_FORM_SELECTOR = '[data-testid="auth-form"]';
const AUTH_SUBMIT_SELECTOR = '[data-testid="auth-submit"]';
// Auth.tsx uses a unified form with data-testids and IDs #auth-email / #auth-password /
// #auth-name / #auth-confirm-password. Selectors below keep legacy
// #signin-* / #signup-* as fallbacks so the spec tolerates both shapes.
const SIGNIN_EMAIL_SELECTOR =
  '[data-testid="auth-email"], #auth-email, #signin-email';
const SIGNIN_PASSWORD_SELECTOR =
  '[data-testid="auth-password"], #auth-password, #signin-password';
const SIGNUP_NAME_SELECTOR =
  '[data-testid="auth-name"], #auth-name, #signup-name, [name="name"][id*="signup"]';
const SIGNUP_EMAIL_SELECTOR =
  '[data-testid="auth-email"], #auth-email, #signup-email, [name="email"][id*="signup"]';
const SIGNUP_PASSWORD_SELECTOR =
  '[data-testid="auth-password"], #auth-password, #signup-password';
const SIGNUP_CONFIRM_SELECTOR =
  '[data-testid="auth-confirm-password"], #auth-confirm-password, #confirm-password, [name="confirm-password"]';

function fillSignInForm(email, password) {
  cy.get(SIGNIN_EMAIL_SELECTOR).filter(':visible').first().clear().type(email);
  cy.get(SIGNIN_PASSWORD_SELECTOR)
    .filter(':visible')
    .first()
    .clear()
    .type(password, { log: false });
}

function submitAuthForm() {
  cy.get(AUTH_FORM_SELECTOR)
    .filter(':visible')
    .first()
    .within(() => {
      cy.get(AUTH_SUBMIT_SELECTOR).click();
    });
}

function fillSignUpForm(email, password, fullName) {
  cy.get(SIGNUP_NAME_SELECTOR)
    .filter(':visible')
    .first()
    .clear()
    .type(fullName);
  cy.get(SIGNUP_EMAIL_SELECTOR).filter(':visible').first().clear().type(email);
  cy.get(SIGNUP_PASSWORD_SELECTOR)
    .filter(':visible')
    .first()
    .clear()
    .type(password, { log: false });
}

// Open sign-up. New Auth.tsx uses `[data-testid="auth-toggle-signup"]`; fall back to
// label text then the old outer tablist.
function openSignUp() {
  cy.get('body').then(($body) => {
    if ($body.find('#auth-name, #signup-name').length) return;
    const testIdToggle = $body.find('[data-testid="auth-toggle-signup"]');
    if (testIdToggle.length) {
      cy.wrap(testIdToggle.first()).click();
      return;
    }
    const toggle = $body.find(
      'button:contains("Créer un compte"), button:contains("Sign up")'
    );
    if (toggle.length) {
      cy.wrap(toggle.first()).click();
      return;
    }
    cy.get('[role="tablist"]', { timeout: 10000 })
      .eq(1)
      .find('[role="tab"]')
      .eq(1)
      .click();
  });
}

// ── Sign-In Tests ─────────────────────────────────────────────────────────────

describe('Auth: Sign In @auth @smoke', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
  });

  it('renders the sign-in form with required fields', () => {
    cy.get(AUTH_FORM_SELECTOR).should('be.visible');
    cy.get(SIGNIN_EMAIL_SELECTOR)
      .filter(':visible')
      .first()
      .should('be.visible');
    cy.get(SIGNIN_PASSWORD_SELECTOR)
      .filter(':visible')
      .first()
      .should('be.visible');
    cy.get(AUTH_FORM_SELECTOR)
      .filter(':visible')
      .first()
      .within(() => {
        cy.get(AUTH_SUBMIT_SELECTOR).should('be.visible');
      });
  });

  it('shows validation error for empty email submission', () => {
    cy.get(SIGNIN_PASSWORD_SELECTOR)
      .filter(':visible')
      .first()
      .type('somepassword');
    cy.get(AUTH_FORM_SELECTOR)
      .filter(':visible')
      .first()
      .within(() => {
        cy.get(AUTH_SUBMIT_SELECTOR).click();
      });
    // Either HTML5 validation or custom error
    cy.get(
      `${SIGNIN_EMAIL_SELECTOR.split(',')
        .map((s) => `${s.trim()}:invalid`)
        .join(', ')}, [data-testid="email-error"], [role="alert"]`
    ).should('exist');
  });

  it('shows error for incorrect credentials', () => {
    fillSignInForm('not-a-real-user@example.com', 'WrongPassword123!');
    submitAuthForm();
    cy.contains(
      /mot de passe incorrect|invalid|identifiants|connexion échouée|email ou mot de passe/i,
      { timeout: 8000 }
    ).should('be.visible');
  });

  it('password field masks input', () => {
    cy.get(SIGNIN_PASSWORD_SELECTOR)
      .filter(':visible')
      .first()
      .should('have.attr', 'type', 'password');
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
    submitAuthForm();

    cy.url({ timeout: 10000 }).should('not.include', '/auth');
  });
});

// ── Sign-Up Tests ─────────────────────────────────────────────────────────────

describe('Auth: Sign Up @auth @regression', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
    openSignUp();
  });

  it('renders the sign-up form', () => {
    cy.get(SIGNUP_NAME_SELECTOR, { timeout: 10000 })
      .first()
      .should('be.visible');
    cy.get(SIGNUP_EMAIL_SELECTOR).first().should('be.visible');
  });

  it('shows validation error for mismatched passwords', () => {
    const timestamp = Date.now();
    fillSignUpForm(
      `test-${timestamp}@example.com`,
      'ValidPass123!',
      'Test User'
    );

    // If there's a password-confirm field, fill it with a different value
    cy.get(SIGNUP_CONFIRM_SELECTOR)
      .first()
      .then(($el) => {
        if ($el.length) {
          cy.wrap($el).clear().type('DifferentPass456!', { log: false });
          cy.get('button[type="submit"]')
            .contains(/inscrire|register|create/i)
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
      .contains(/inscrire|register|create/i)
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
      .contains(/inscrire|register|create/i)
      .click();

    cy.contains(/déjà utilisé|already|exists|email exist|utilisé/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('page title or heading indicates the sign-up section', () => {
    cy.get(SIGNUP_NAME_SELECTOR).first().should('be.visible');
    // New Auth.tsx exposes sign-up via a heading ("Créer un compte" / "Create
    // account"); legacy Auth used a tab with aria-selected.
    cy.get('body').then(($body) => {
      const hasSelectedTab =
        $body.find('[role="tab"][aria-selected="true"]').length > 0;
      if (hasSelectedTab) {
        cy.get('[role="tab"][aria-selected="true"]')
          .invoke('text')
          .should('match', /inscrire|register|sign up/i);
      } else {
        cy.contains(
          'h1, h2, h3',
          /créer un compte|create account|s'inscrire|sign up/i
        ).should('be.visible');
      }
    });
  });
});

// ── Password Reset Tests ──────────────────────────────────────────────────────

describe('Auth: Password Reset @auth @regression', () => {
  beforeEach(() => {
    cy.visit(AUTH_URL);
    // Opens OTPAuthFlow (reset) — primary action is "Envoyer le code" (type=button, not form submit)
    cy.contains(/mot de passe oublié|forgot/i).click();
    cy.contains(/réinitialiser|reset password/i, { timeout: 10000 }).should(
      'be.visible'
    );
  });

  it('shows a reset password form with an email field', () => {
    cy.get('#contact, input[type="email"]', { timeout: 10000 })
      .first()
      .should('be.visible');
  });

  it('shows success feedback after submitting a valid email', () => {
    const email = Cypress.env('CUSTOMER_EMAIL') || 'test@example.com';

    cy.get('#contact').clear().type(email);
    cy.contains('button', /envoyer le code|envoyer|send/i, { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.contains(
      /réinitialisation envoyé|email envoyé|lien envoyé|check your email|vérifiez votre|sent|OTP/i,
      { timeout: 12000 }
    ).should('be.visible');
  });

  it('shows error for invalid email format', () => {
    cy.get('#contact').clear().type('not-valid');
    cy.contains('button', /envoyer le code|envoyer|send/i, {
      timeout: 10000,
    }).click();

    // Controlled input: validation runs in handleSendOTP → toast.error("Format d'email invalide")
    cy.contains(/format d'email invalide|invalid email|invalid format/i, {
      timeout: 8000,
    }).should('be.visible');
  });

  it('has a link to go back to sign-in', () => {
    cy.contains(/retour|back|connexion|se connecter/i).should('be.visible');
  });
});

// ── Protected Route Redirect ──────────────────────────────────────────────────

describe('Auth: Protected Routes @auth @smoke', () => {
  it('shows login required on /profile when unauthenticated (stays on /profile)', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/profile');
    cy.url({ timeout: 6000 }).should('include', '/profile');
    cy.contains(/connexion requise|login required|sign in/i, {
      timeout: 8000,
    }).should('be.visible');
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
