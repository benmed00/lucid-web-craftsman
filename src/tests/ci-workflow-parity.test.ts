/**
 * CI workflow parity — catches drift between repo files and GitHub Actions assumptions.
 *
 * Prerequisites: none (reads filesystem + package.json only).
 * Run: `pnpm exec vitest run src/tests/ci-workflow-parity.test.ts`
 *
 * Keep the pricing-snapshot paths in sync with:
 * `.github/workflows/deno-create-payment.yml` → "Guard — no env vars / network" → FILES array.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Mirror of deno-create-payment.yml guard step FILES (update both when changing). */
const PRICING_SNAPSHOT_OFFLINE_GUARD_FILES = [
  'supabase/functions/_shared/pricing-snapshot_test.ts',
  'supabase/functions/_shared/pricing_snapshot_golden_test.ts',
  'supabase/functions/_shared/pricing_snapshot_extended_test.ts',
  'supabase/functions/_shared/persist-pricing-snapshot_test.ts',
  'supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts',
  'supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts',
] as const;

/** Scripts invoked by `.github/workflows/ci.yml` (job `ci`). */
const ROOT_CI_SCRIPTS = [
  'lint',
  'format:check',
  'check:edge-functions:bundling:full',
  'openapi:edge-functions:check',
  'postman:collection:check',
  'type:check',
  'test:unit',
  'build',
] as const;

function readPackageJson(): { scripts?: Record<string, string> } {
  const raw = readFileSync(resolve(ROOT, 'package.json'), 'utf8');
  return JSON.parse(raw) as { scripts?: Record<string, string> };
}

describe('CI workflow parity', () => {
  it('pricing-snapshot guard files exist (deno-create-payment workflow)', () => {
    for (const rel of PRICING_SNAPSHOT_OFFLINE_GUARD_FILES) {
      const abs = resolve(ROOT, rel);
      expect(
        existsSync(abs),
        `Missing ${rel} — update workflow FILES and this test together`
      ).toBe(true);
    }
  });

  it('root ci.yml scripts are defined in package.json', () => {
    const { scripts = {} } = readPackageJson();
    for (const name of ROOT_CI_SCRIPTS) {
      expect(
        scripts[name],
        `package.json scripts["${name}"] required by .github/workflows/ci.yml`
      ).toBeTruthy();
    }
  });

  it('ci:local aggregates root CI steps', () => {
    const { scripts = {} } = readPackageJson();
    expect(scripts['ci:local']).toBeTruthy();
    const chain = String(scripts['ci:local']);
    expect(chain).toContain('lint');
    expect(chain).toContain('test:unit');
    expect(chain).toContain('build');
  });
});
