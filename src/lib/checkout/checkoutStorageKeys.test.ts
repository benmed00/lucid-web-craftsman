import { describe, expect, it } from 'vitest';
import { getCheckoutStorageKeys } from './checkoutStorageKeys';

describe('getCheckoutStorageKeys', () => {
  it('returns standard keys without suffix', () => {
    const k = getCheckoutStorageKeys(false);
    expect(k.form).toBe('checkout_form_data');
    expect(k.step).toBe('checkout_current_step');
    expect(k.completed).toBe('checkout_completed_steps');
    expect(k.timestamp).toBe('checkout_timestamp');
    expect(k.coupon).toBe('checkout_applied_coupon');
  });

  it('returns elevated keys with _elevated suffix', () => {
    const k = getCheckoutStorageKeys(true);
    expect(k.form).toBe('checkout_form_data_elevated');
    expect(k.step).toBe('checkout_current_step_elevated');
    expect(k.completed).toBe('checkout_completed_steps_elevated');
    expect(k.timestamp).toBe('checkout_timestamp_elevated');
    expect(k.coupon).toBe('checkout_applied_coupon_elevated');
  });
});
