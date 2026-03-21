import { CHECKOUT_VALIDATION_ERROR_PREFIX } from '../constants.ts';

/** Normalizes `catch (unknown)` for logging and JSON error bodies. */
export function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function errorConstructorLabel(error: unknown): string {
  if (error instanceof Error) return error.constructor?.name || 'Error';
  return typeof error;
}

/**
 * Whether the handler should respond with **422** (`error_type: validation`) instead of 500.
 * Covers Zod (`CHECKOUT_VALIDATION_ERROR_PREFIX`), email/product checks, and French stock messages.
 */
export function isClientFacingValidationError(message: string): boolean {
  if (message.startsWith(CHECKOUT_VALIDATION_ERROR_PREFIX)) return true;
  return (
    message.includes('introuvable') ||
    message.includes('indisponible') ||
    message.includes('insuffisant') ||
    message.includes('Invalid') ||
    message.includes('No items')
  );
}
