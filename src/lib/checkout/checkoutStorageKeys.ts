/** localStorage/sessionStorage key sets for checkout persistence */
export function getCheckoutStorageKeys(elevated: boolean) {
  const s = elevated ? '_elevated' : '';
  return {
    form: `checkout_form_data${s}`,
    step: `checkout_current_step${s}`,
    completed: `checkout_completed_steps${s}`,
    timestamp: `checkout_timestamp${s}`,
    coupon: `checkout_applied_coupon${s}`,
  } as const;
}
