import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import eslintPluginReact from "eslint-plugin-react";
import ignore from "eslint-config-flat-gitignore";

export default [
  ignore(),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/backend/server/server.cjs', // ← fichier problématique
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react: eslintPluginReact,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "@typescript-eslint": tseslint.plugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // TypeScript
      '@typescript-eslint/await-thenable': 'error',
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      
      // React
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      
      // React Hooks
      ...reactHooks.configs.recommended.rules,
      
      // React Refresh
      "react-refresh/only-export-components": "warn",
      
      // Accessibility
      ...jsxA11y.configs.recommended.rules,
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],
    },
  },
  {
    files: ["**/*.js", '**/*.ts', '**/*.tsx'],
    ...tseslint.configs.disableTypeChecked,
  },
];