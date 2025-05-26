// eslint.config.js

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import eslintPluginReact from "eslint-plugin-react";
import ignore from "eslint-config-flat-gitignore";

export default tseslint.config(
  ignore(), // Respecte automatiquement .gitignore

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: eslintPluginReact,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // HMR
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // React
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",

      // Accessibilité
      ...jsxA11y.configs.recommended.rules,

      // TypeScript
      "@typescript-eslint/no-unused-vars": "off",

      // Style optionnel : JSX dans TSX uniquement
      "react/jsx-filename-extension": ["warn", { extensions: [".tsx"] }],
    },
  }
);
