import { describe, expect, it } from 'vitest';
import {
  buildPaymentSuccessPollDelaysFromEnv,
  resolvePaymentPollingFromEnv,
} from './paymentPollingConfig';

describe('buildPaymentSuccessPollDelaysFromEnv', () => {
  it('defaults to backoff schedule within ~32s budget', () => {
    const d = buildPaymentSuccessPollDelaysFromEnv({});
    expect(d.length).toBeGreaterThanOrEqual(5);
    const sum = d.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(32_000);
    expect(d[0]).toBe(2000);
    expect(d.every((x) => x >= 1000 && x <= 5000)).toBe(true);
  });

  it('respects max wait cap', () => {
    const d = buildPaymentSuccessPollDelaysFromEnv({
      VITE_PAYMENT_SUCCESS_MAX_WAIT_MS: '12000',
    });
    const sum = d.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(12_000);
  });

  it('uses flat schedule when legacy poll vars set without max-wait', () => {
    const d = buildPaymentSuccessPollDelaysFromEnv({
      VITE_PAYMENT_SUCCESS_MAX_POLLS: '4',
      VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS: '1500',
    });
    expect(d).toEqual([1500, 1500, 1500, 1500]);
  });

  it('prefers max-wait backoff when max-wait is explicit', () => {
    const d = buildPaymentSuccessPollDelaysFromEnv({
      VITE_PAYMENT_SUCCESS_MAX_POLLS: '4',
      VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS: '1500',
      VITE_PAYMENT_SUCCESS_MAX_WAIT_MS: '30000',
    });
    expect(d.length).not.toBe(4);
    expect(d[0]).toBe(2000);
  });
});

describe('resolvePaymentPollingFromEnv (legacy flat)', () => {
  it('uses defaults when env empty', () => {
    const c = resolvePaymentPollingFromEnv({});
    expect(c.maxPolls).toBe(8);
    expect(c.pollIntervalMs).toBe(2000);
  });

  it('clamps max polls and interval', () => {
    expect(
      resolvePaymentPollingFromEnv({
        VITE_PAYMENT_SUCCESS_MAX_POLLS: '1',
        VITE_PAYMENT_SUCCESS_POLL_INTERVAL_MS: '100',
      })
    ).toEqual({ maxPolls: 3, pollIntervalMs: 1000 });
  });
});
