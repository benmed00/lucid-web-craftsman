/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** True when running under Vitest */
  readonly VITEST?: boolean;
  /** Build / deploy label (`vite.config` define; override with `VITE_APP_VERSION`). */
  readonly VITE_APP_VERSION: string;
  /** Set by `pnpm run dev:e2e` — disables dev-only UI (e.g. React Query Devtools) for stable Cypress */
  readonly VITE_E2E?: string;
  /** Node/Vitest only — never prefix with VITE_ or use in browser bundles */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
}
