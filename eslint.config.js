/**
 * ESLint configuration (flat config format)
 *
 * Uses ESLint 9 flat config with TypeScript, React, and accessibility plugins.
 * Prettier is applied last to avoid rule conflicts.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @see https://typescript-eslint.io/
 */

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  // ==========================================================================
  // Global ignores
  // ==========================================================================
  {
    ignores: [
      'dist', // Vite build output
      'coverage/**', // Vitest coverage reports (generated; may have eslint-disable stubs)
    ],
  },

  // ==========================================================================
  // TypeScript & React base
  // ==========================================================================
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Many effects intentionally omit deps (e.g. mount-only, stable callbacks); audit before tightening.
      'react-hooks/exhaustive-deps': 'off',
      // shadcn/ui and contexts export helpers/hooks next to components; Fast Refresh still works in practice.
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      // Unused vars: allow _ prefix to signal intentionally unused
      'unused-imports/no-unused-vars': [
        'warn',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Fix ESLint 9 + typescript-eslint crash when options undefined
      '@typescript-eslint/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },

  // ==========================================================================
  // JSX accessibility (a11y)
  // ==========================================================================
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // Legacy markup uses div/span click handlers; prefer native controls in new UI.
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'jsx-a11y/img-redundant-alt': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/anchor-has-content': 'off',
      'jsx-a11y/no-redundant-roles': 'off',
    },
  },

  // ==========================================================================
  // Extra TypeScript & code quality
  // ==========================================================================
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Gradual typing: re-enable when legacy `any` is replaced with proper types.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      'no-prototype-builtins': 'warn',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-catch': 'warn',
      'no-control-regex': 'warn',
    },
  },

  // Test files: unused bindings are common in mocks and assertions
  {
    files: ['src/tests/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
    },
  },

  // Leaf UI: Supabase client only via src/services (and AuthContext).
  {
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: [
      '**/*.{test,spec}.{ts,tsx}',
      // Grandfathered from main's token-based OrderConfirmation / Artisans /
      // Logout / ABThemeManager — each still reads supabase directly. Track
      // these as follow-up in the admin services refactor instead of blocking
      // every merge from main.
      'src/components/admin/ABThemeManager.tsx',
      'src/pages/Artisans.tsx',
      'src/pages/Logout.tsx',
      'src/pages/OrderConfirmation.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/integrations/supabase/client',
              message:
                'Import Supabase through src/services/* or shared hooks; keep pages/components free of the raw client.',
            },
          ],
        },
      ],
    },
  },

  // Supabase Edge Functions run on Deno with their own typecheck config; the
  // Node-side ESLint resolver cannot see Deno std / npm: imports, so
  // @ts-nocheck / @ts-ignore pragmas are the practical escape hatch here.
  {
    files: ['supabase/functions/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },

  // Prettier must be last to override conflicting rules
  eslintConfigPrettier
);
