/**
 * Vitest helpers: stable English (or custom) strings for `useTranslation` mocks so
 * assertions can read like UX copy instead of raw i18n keys — without loading full i18n.
 *
 * Use for high-churn page tests (Auth, Checkout); fall back to the key when missing.
 *
 * **Vitest:** do not import these symbols from inside `vi.mock('react-i18next', () => …)`
 * factories — hoisting breaks top-level imports. Use inline `t: (k) => k` in `vi.mock`,
 * or exercise this module from a small `src/tests/*.test.ts` bundle (see `i18n-test-utils.test.ts`).
 */

export type TranslationOptions = {
  returnObjects?: boolean;
};

/**
 * Returns a `react-i18next`-style `t` that resolves known keys from `strings` and
 * otherwise returns the key (legacy test behavior).
 */
export function createStableT(
  strings: Record<string, string>
): (key: string, opts?: TranslationOptions) => string | unknown[] {
  return (key: string, opts?: TranslationOptions) => {
    if (opts?.returnObjects) {
      return [];
    }
    return strings[key] ?? key;
  };
}

/** Default export shape for `vi.mock('react-i18next', () => ({ ... }))`. */
export function mockUseTranslationModule(strings: Record<string, string>) {
  return {
    useTranslation: () => ({
      t: createStableT(strings),
      i18n: { language: 'en' },
    }),
  };
}

/** Common auth/checkout keys — extend as needed for assertions. */
export const STABLE_I18N_STRINGS: Record<string, string> = {
  // common (logout flow on Logout page, etc.)
  'common:logoutFlow.signingOut': 'Signing out…',
};
