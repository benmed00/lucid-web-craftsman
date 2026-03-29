/**
 * COD (Cash on Delivery) eligibility based on postal code.
 * Only Loire-Atlantique (44xxx) is eligible.
 * This is the SINGLE SOURCE OF TRUTH — used by both frontend and referenced by backend.
 */
export function isEligibleForCOD(postalCode?: string): boolean {
  if (!postalCode) return false;
  const normalized = postalCode.trim();
  return /^44\d{3}$/.test(normalized);
}
