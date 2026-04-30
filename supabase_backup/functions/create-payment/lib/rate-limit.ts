import { MAX_PAYMENT_ATTEMPTS, RATE_LIMIT_WINDOW_MS } from '../constants.ts';

type RateLimitRecord = { count: number; resetTime: number };

const rateLimitStore: Map<string, RateLimitRecord> = new Map();

export type RateLimitResult = { allowed: boolean; remaining: number };

export const checkRateLimit: (identifier: string) => RateLimitResult = (
  identifier
) => {
  const now: number = Date.now();
  const record: RateLimitRecord | undefined = rateLimitStore.get(identifier);
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_PAYMENT_ATTEMPTS - 1 };
  }
  if (record.count >= MAX_PAYMENT_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }
  record.count++;
  return { allowed: true, remaining: MAX_PAYMENT_ATTEMPTS - record.count };
};
