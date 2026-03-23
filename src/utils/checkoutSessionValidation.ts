// src/utils/checkoutSessionValidation.ts
// Validation layer for checkout session data integrity

export interface PersonalInfoData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
}

export interface ShippingInfoData {
  address?: string;
  address_line1?: string;
  addressComplement?: string;
  address_line2?: string;
  postalCode?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

/**
 * Validates personal info has meaningful content.
 * Returns false for empty/placeholder data that should NOT be displayed.
 */
export function isValidPersonalInfo(
  data: PersonalInfoData | null | undefined
): boolean {
  if (!data) return false;

  const email = data.email || '';
  const firstName = data.firstName || data.first_name || '';
  const lastName = data.lastName || data.last_name || '';

  return (
    typeof email === 'string' &&
    email.includes('@') &&
    email.length >= 5 &&
    typeof firstName === 'string' &&
    firstName.trim().length >= 1 &&
    typeof lastName === 'string' &&
    lastName.trim().length >= 1
  );
}

/**
 * Validates shipping info has meaningful content.
 * Returns false for empty/placeholder data that should NOT be displayed.
 */
export function isValidShippingInfo(
  data: ShippingInfoData | null | undefined
): boolean {
  if (!data) return false;

  const address = data.address || data.address_line1 || '';
  const city = data.city || '';
  const country = data.country || '';

  return (
    typeof address === 'string' &&
    address.trim().length >= 5 &&
    typeof city === 'string' &&
    city.trim().length >= 2 &&
    typeof country === 'string' &&
    country.trim().length >= 2
  );
}

/**
 * Checks if checkout form data has any meaningful user input
 */
export function hasValidFormData(data: {
  firstName: string;
  lastName: string;
  email: string;
}): boolean {
  return isValidPersonalInfo(data);
}
