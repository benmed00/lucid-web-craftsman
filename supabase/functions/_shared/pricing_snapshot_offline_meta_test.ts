/**
 * Meta-test — proves the pricing-snapshot Deno suite stays offline & env-free.
 *
 * What it does:
 *   1. Spawns `deno test` on the real pricing-snapshot test files via
 *      `Deno.Command`, but **without** `--allow-net` and with a **stripped
 *      environment** (only PATH + HOME, like `env -i …`).
 *   2. Also runs a `--cached-only` variant to assert no network is needed.
 *   3. Optionally spawns a "negative control" inline test that calls
 *      `fetch(...)` to confirm Deno's permission model would have blocked
 *      a real network call (sanity check on the runtime — not on our code).
 *
 * Why a separate file:
 *   This test needs `--allow-run` + `--allow-env` to spawn deno; the rest of
 *   the suite must NOT have those. Keeping it isolated lets the CI guard
 *   (no `Deno.env` / no `fetch` in the main suite) stay strict.
 *
 * Run with:
 *   deno test --allow-run --allow-env --allow-read=. --no-check \
 *     --config supabase/functions/deno.json \
 *     supabase/functions/_shared/pricing_snapshot_offline_meta_test.ts
 *   # or via npm: `npm run test:pricing-snapshot:offline-meta`
 *
 * Skipped in environments without `deno` on PATH (shouldn't happen — the
 * test file itself runs under deno — but defensive).
 */
import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1';

// Files exercised by `npm run test:pricing-snapshot:deno` — keep in sync.
const PRICING_TEST_FILES = [
  'supabase/functions/_shared/pricing-snapshot_test.ts',
  'supabase/functions/_shared/pricing-snapshot_golden_test.ts',
  'supabase/functions/_shared/pricing-snapshot_extended_test.ts',
  'supabase/functions/_shared/persist-pricing-snapshot_test.ts',
  'supabase/functions/_shared/confirm-order_test.ts',
  'supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts',
  'supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts',
];

const DENO_CONFIG = 'supabase/functions/deno.json';

/** Minimal environment — mirrors `env -i PATH=… HOME=…`. */
function strippedEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const path = Deno.env.get('PATH');
  const home = Deno.env.get('HOME');
  if (path) env.PATH = path;
  if (home) env.HOME = home;
  // Keep DENO_DIR so the cache is shared with the parent run (cached-only works).
  const denoDir = Deno.env.get('DENO_DIR');
  if (denoDir) env.DENO_DIR = denoDir;
  return env;
}

async function runDeno(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const cmd = new Deno.Command('deno', {
    args,
    env: strippedEnv(),
    clearEnv: true,
    stdout: 'piped',
    stderr: 'piped',
  });
  const out = await cmd.output();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout),
    stderr: new TextDecoder().decode(out.stderr),
  };
}

Deno.test(
  'pricing-snapshot suite passes with NO env vars and NO network permission',
  async () => {
    const { code, stdout, stderr } = await runDeno([
      'test',
      '--allow-read=.',
      '--no-check',
      '--config',
      DENO_CONFIG,
      ...PRICING_TEST_FILES,
    ]);

    if (code !== 0) {
      console.error('--- stdout ---\n' + stdout);
      console.error('--- stderr ---\n' + stderr);
    }
    assertEquals(code, 0, 'pricing-snapshot suite must pass without --allow-env / --allow-net');

    // Deno final summary: "ok | N passed | 0 failed (XXms)"
    const summary = stdout.match(/^(ok|FAILED)\s*\|\s*(\d+)\s+passed\s*\|\s*(\d+)\s+failed/m);
    assert(summary, `could not find Deno summary line in stdout:\n${stdout}`);
    assertEquals(summary![1], 'ok');
    assertEquals(summary![3], '0', 'no test must fail');
    assert(Number(summary![2]) > 0, 'at least one test should run');
  },
);

Deno.test(
  'pricing-snapshot suite passes with --cached-only (no network at all)',
  async () => {
    const { code, stdout, stderr } = await runDeno([
      'test',
      '--cached-only',
      '--allow-read=.',
      '--no-check',
      '--config',
      DENO_CONFIG,
      ...PRICING_TEST_FILES,
    ]);

    if (code !== 0) {
      console.error('--- stdout ---\n' + stdout);
      console.error('--- stderr ---\n' + stderr);
      // If the cache isn't warm, fail with an actionable message.
      if (/Specifier not found in cache|cached only/i.test(stderr)) {
        throw new Error(
          'Deno cache not warm. Run once online:\n' +
            '  deno cache --config ' + DENO_CONFIG + ' \\\n' +
            '    ' + PRICING_TEST_FILES.join(' \\\n    '),
        );
      }
    }
    assertEquals(code, 0, 'pricing-snapshot suite must pass with --cached-only');
  },
);

Deno.test(
  "negative control — `fetch()` is denied without --allow-net (Deno security model sanity check)",
  async () => {
    // Inline TS source executed via `deno eval` under stripped env + no --allow-net.
    const src = `try { await fetch("https://example.com"); console.log("FETCH_OK"); } ` +
      `catch (e) { console.log("FETCH_DENIED:" + (e as Error).name); }`;

    const cmd = new Deno.Command('deno', {
      args: ['eval', '--no-check', src],
      env: strippedEnv(),
      clearEnv: true,
      stdout: 'piped',
      stderr: 'piped',
    });
    const out = await cmd.output();
    const stdout = new TextDecoder().decode(out.stdout);
    const stderr = new TextDecoder().decode(out.stderr);

    // We expect either:
    //  (a) a non-zero exit with `Requires net access` in stderr, OR
    //  (b) the catch block fired with FETCH_DENIED:PermissionDenied / NotCapable.
    const denied =
      /Requires net access/i.test(stderr) ||
      /PermissionDenied|NotCapable/i.test(stdout) ||
      /FETCH_DENIED:/i.test(stdout);

    assert(
      denied,
      'fetch() should be blocked without --allow-net.\n' +
        `exit=${out.code}\nstdout=${stdout}\nstderr=${stderr}`,
    );
    // Belt-and-suspenders: explicitly forbid the success marker.
    assert(!/FETCH_OK/.test(stdout), 'fetch() unexpectedly succeeded — Deno permission model broken?');
    assertStringIncludes(
      stdout + stderr,
      // Any of these substrings proves the denial path was exercised.
      // Pick the first that matches to keep the assertion specific.
      [/Requires net access/i, /PermissionDenied/i, /NotCapable/i, /FETCH_DENIED:/i].find((re) =>
        re.test(stdout + stderr),
      )!.source.replace(/\\/g, ''),
    );
  },
);
