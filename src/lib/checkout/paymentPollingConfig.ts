/**
 * Payment return page: poll `order-lookup` while the Stripe webhook lands.
 *
 * Default: exponential backoff within a max wall-clock wait (~32s), capped steps.
 * Legacy flat polling: set VITE_PAYMENT_SUCCESS_MAX_POLLS + VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS
 * (if both set and VITE_PAYMENT_SUCCESS_MAX_WAIT_MS is unset, flat mode is used).
 */

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export type PaymentSuccessPollingConfig = {
  maxPolls: number;
  pollIntervalMs: number;
};

/** @deprecated for UI — prefer getPaymentSuccessPollDelays(); kept for tests / tooling */
export function resolvePaymentPollingFromEnv(
  env: Record<string, string | undefined>
): PaymentSuccessPollingConfig {
  const maxPolls = clamp(
    parsePositiveInt(env.VITE_PAYMENT_SUCCESS_MAX_POLLS, 8),
    3,
    24
  );
  const pollIntervalMs = clamp(
    parsePositiveInt(env.VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS, 2000),
    1000,
    5000
  );
  return { maxPolls, pollIntervalMs };
}

/**
 * Sleep durations between order-lookup polls (after the first immediate lookup).
 * Exponential backoff until max wall time or max steps.
 */
export function buildPaymentSuccessPollDelaysFromEnv(
  env: Record<string, string | undefined>
): number[] {
  const maxWaitExplicit = env.VITE_PAYMENT_SUCCESS_MAX_WAIT_MS;
  const hasFlat =
    env.VITE_PAYMENT_SUCCESS_MAX_POLLS != null &&
    env.VITE_PAYMENT_SUCCESS_MAX_POLLS !== '' &&
    env.VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS != null &&
    env.VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS !== '';

  // Flat mode: explicit legacy vars and no max-wait override
  if (hasFlat && (maxWaitExplicit === undefined || maxWaitExplicit === '')) {
    const { maxPolls, pollIntervalMs } = resolvePaymentPollingFromEnv(env);
    return Array.from({ length: maxPolls }, () => pollIntervalMs);
  }

  const maxTotalWaitMs = clamp(
    parsePositiveInt(maxWaitExplicit, 32_000),
    10_000,
    120_000
  );
  const initialMs = clamp(
    parsePositiveInt(env.VITE_PAYMENT_SUCCESS_POLL_INITIAL_MS, 2000),
    1000,
    8000
  );
  const maxIntervalMs = clamp(
    parsePositiveInt(env.VITE_PAYMENT_SUCCESS_POLL_MAX_INTERVAL_MS, 5000),
    2000,
    15_000
  );
  const factor = clamp(
    parseFloat(env.VITE_PAYMENT_SUCCESS_POLL_BACKOFF_FACTOR || '1.25'),
    1.05,
    2.5
  );
  const maxSteps = clamp(
    parsePositiveInt(env.VITE_PAYMENT_SUCCESS_MAX_POLL_STEPS, 24),
    5,
    40
  );

  const delays: number[] = [];
  let total = 0;
  let gap = initialMs;
  while (delays.length < maxSteps && total + gap <= maxTotalWaitMs) {
    delays.push(gap);
    total += gap;
    gap = Math.min(maxIntervalMs, Math.round(gap * factor));
  }
  return delays;
}

export function getPaymentSuccessPollDelays(): number[] {
  return buildPaymentSuccessPollDelaysFromEnv(
    import.meta.env as unknown as Record<string, string | undefined>
  );
}

/** @deprecated use getPaymentSuccessPollDelays */
export function getPaymentSuccessPollingConfig(): PaymentSuccessPollingConfig {
  return resolvePaymentPollingFromEnv(
    import.meta.env as unknown as Record<string, string | undefined>
  );
}
