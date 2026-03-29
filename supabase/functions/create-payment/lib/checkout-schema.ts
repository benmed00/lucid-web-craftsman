import { z } from 'zod';

import {
  CHECKOUT_VALIDATION_ERROR_PREFIX,
  MAX_CART_ITEMS,
} from '../constants.ts';

const checkoutCartItemSchema = z.object({
  product: z.object({
    id: z.coerce.number().finite().positive(),
    price: z.coerce.number().finite().optional(),
  }),
  quantity: z.coerce.number().int().positive(),
});

/** Optional blocks stay permissive (passthrough) so new client fields do not break checkout. */
const customerInfoSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    addressComplement: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  })
  .passthrough();

const discountSchema = z
  .object({
    code: z.string().optional(),
    amount: z.coerce.number().optional(),
    includesFreeShipping: z.boolean().optional(),
  })
  .passthrough();

const guestSessionSchema = z
  .object({
    guest_id: z.string().optional(),
    device_type: z.string().optional(),
    os: z.string().optional(),
    browser: z.string().optional(),
  })
  .passthrough();

export const checkoutRequestSchema = z
  .object({
    items: z.array(checkoutCartItemSchema).min(1).max(MAX_CART_ITEMS),
    customerInfo: customerInfoSchema.optional(),
    discount: discountSchema.optional(),
    guestSession: guestSessionSchema.optional(),
    paymentMethod: z.enum(['card', 'paypal', 'cod']).optional().default('card'),
  })
  .strip();

export type ParsedCheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/**
 * Validates JSON body shape for create-payment. Strips unknown top-level keys.
 * @throws Error — message starts with `CHECKOUT_VALIDATION_ERROR_PREFIX` (see `constants.ts`) for HTTP 422 mapping.
 */
export function parseCheckoutRequestBody(raw: unknown): ParsedCheckoutRequest {
  const result = checkoutRequestSchema.safeParse(raw);
  if (!result.success) {
    const detail = result.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(
      `${CHECKOUT_VALIDATION_ERROR_PREFIX} ${detail || 'validation failed'}`
    );
  }
  return result.data;
}
