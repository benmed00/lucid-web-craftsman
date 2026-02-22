# Commit plan: config comments and coherent packaging

## Completed commits

1. **chore(config): add thorough comments to all config files** — eslint, cypress, vite, tailwind, .prettierignore, .gitignore, .markdownlintignore
2. **docs: add Prettier configuration documentation** — docs/PRETTIER.md

## Remaining commands (run manually if needed)

```powershell
cd c:\Users\1\Documents\GitHub\lucid-web-craftsman

# Commit 3: Package scripts
git add package.json package-lock.json
git commit -m "chore(scripts): add validate pipeline, test:unit, coverage dep`n`n- validate: lint (max-warnings 9999) + format:check + test --run`n- test:unit: vitest run excluding rls-* specs`n- coverage: add @vitest/coverage-v8`n- e2e:smoke / e2e:regression: grep tags for focused E2E runs"

# Commit 4: Cypress tags
git add cypress/e2e/checkout_flow_spec.js cypress/integration/header_nav_spec.js cypress/integration/mobile_menu_spec.js cypress/integration/navigation_stability_spec.js
git commit -m "test(cypress): add @smoke and @regression tags to E2E specs`n`n- checkout_flow_spec: @smoke @regression`n- header_nav_spec: @smoke @regression, @regression`n- mobile_menu_spec, navigation_stability_spec: @regression"

# Commit 5: Docs
git add docs/PACKAGE-SCRIPTS-ANALYSIS.md docs/COMMIT_PLAN.md
git commit -m "docs: add package scripts analysis and commit plan`n`n- PACKAGE-SCRIPTS-ANALYSIS.md: full analysis of all 23 npm scripts`n- COMMIT_PLAN.md: commit grouping rationale"
```

---

## Original plan (for reference)

## Commit 1: Add thorough comments to all config files ✅

**Files:**

- `eslint.config.js` — JSDoc header, section comments, rule explanations
- `cypress.config.ts` — Header, specPattern, env, grep plugin
- `vite.config.ts` — Header, server/build/test section comments
- `tailwind.config.ts` — Header, semantic tokens note
- `.prettierignore` — Header, group comments
- `.gitignore` — Header, group comments
- `.markdownlintignore` — Header, _headers rationale

**Message:**

```text
chore(config): add thorough comments to all config files

- eslint.config.js: JSDoc, ignores, rule rationale (unused-vars, no-unused-expressions)
- cypress.config.ts: specPattern, baseUrl, grep plugin
- vite.config.ts: server, build, test sections
- tailwind.config.ts: darkMode, semantic tokens
- .prettierignore, .gitignore, .markdownlintignore: section headers
```

## Commit 2: Add Prettier documentation

**Files:**

- `docs/PRETTIER.md` — Documents .prettierrc.json options (JSON has no comments)

## Commit 3: Package scripts and validate pipeline

**Files:**

- `package.json` — validate, test:unit, coverage dep
- `package-lock.json` — Regenerated

## Commit 4: Cypress tags and config

**Files:**

- `cypress.config.ts` — specPattern, grep (if not in commit 1)
- `cypress/integration/*.js`, `cypress/e2e/*.js` — @smoke, @regression tags

## Commit 5: Docs

**Files:**

- `docs/PACKAGE-SCRIPTS-ANALYSIS.md`
- `docs/COMMIT_PLAN.md` (this file — optional to commit or delete)

```
