// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // 🌐 Global ignores (valide pour tout le projet)
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.vite/**",
      "**/.turbo/**",
      "**/public/**",
      "**/*.test.*",
      "**/*.spec.*",
    ],
  },

  // 🌱 JavaScript backend
  {
    files: ["backend/**/*.js", "backend/**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "warn",
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  // ⚙️ TypeScript backend
  {
    files: ["backend/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.backend.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked.rules,
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },

  // 🎨 Frontend React TypeScript
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommendedTypeChecked.rules,
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
];
