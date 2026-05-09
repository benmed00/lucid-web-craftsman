/**
 * Zod schemas for Supabase Edge `functions.invoke` JSON bodies (checkout / payment).
 *
 * @remarks
 * Align with OpenAPI in `openapi/supabase-edge-functions.json` and each function’s `index.ts`.
 * Prefer {@link parseCreatePaymentInvokeBody}, {@link parseOrderLookupResponse}, {@link parseStripeSessionDisplayResponse}
 * on raw `unknown` before trusting shapes.
 *
 * @module contracts/edge-invoke-responses
 *
 * Run: `pnpm exec vitest run src/types/contracts/edge-invoke-responses.test.ts`
 */
import { z } from 'zod';

/** create-payment / create-paypal-payment success + server-reported error payloads */
export const createPaymentInvokeBodySchema = z
  .object({
    url: z.string().optional(),
    error: z.string().optional(),
    error_type: z.string().optional(),
  })
  .passthrough();

export type CreatePaymentInvokeBody = z.infer<
  typeof createPaymentInvokeBodySchema
>;

const orderLookupItemSchema = z
  .object({
    id: z.string(),
    product_id: z.number(),
    quantity: z.number(),
    unit_price: z.number(),
    total_price: z.number(),
    product_snapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough();

/** POST order-lookup — see `supabase/functions/order-lookup/index.ts` `buildResponse` */
export const orderLookupResponseSchema = z.discriminatedUnion('found', [
  z
    .object({
      found: z.literal(false),
      error: z.string().optional(),
    })
    .passthrough(),
  z
    .object({
      found: z.literal(true),
      order_id: z.string(),
      status: z.string().nullable().optional(),
      order_status: z.string().nullable().optional(),
      is_paid: z.boolean().optional(),
      webhook_processed: z.boolean().optional(),
      amount: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
      pricing_snapshot: z.unknown().nullable().optional(),
      subtotal_amount: z.number().nullable().optional(),
      discount_amount: z.number().nullable().optional(),
      shipping_amount: z.number().nullable().optional(),
      total_amount: z.number().nullable().optional(),
      order_items: z.array(orderLookupItemSchema).optional(),
    })
    .passthrough(),
]);

export type OrderLookupResponse = z.infer<typeof orderLookupResponseSchema>;

const stripeSessionLineItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  total: z.number(),
});

/** POST stripe-session-display — see `supabase/functions/stripe-session-display/index.ts` */
export const stripeSessionDisplayResponseSchema = z
  .object({
    ok: z.boolean(),
    error: z.string().optional(),
    session_id: z.string().optional(),
    payment_status: z.string().optional(),
    customer_email: z.string().nullable().optional(),
    amount_total: z.number().optional(),
    currency: z.string().optional(),
    items: z.array(stripeSessionLineItemSchema).optional(),
  })
  .passthrough();

export type StripeSessionDisplayResponse = z.infer<
  typeof stripeSessionDisplayResponseSchema
>;

export function parseCreatePaymentInvokeBody(
  raw: unknown
): CreatePaymentInvokeBody {
  const r = createPaymentInvokeBodySchema.safeParse(raw);
  if (!r.success) {
    return {};
  }
  return r.data;
}

export function parseOrderLookupResponse(
  raw: unknown
):
  | { ok: true; data: OrderLookupResponse }
  | { ok: false; error: z.ZodError<OrderLookupResponse> } {
  const r = orderLookupResponseSchema.safeParse(raw);
  if (!r.success) {
    return { ok: false, error: r.error };
  }
  return { ok: true, data: r.data };
}

export function parseStripeSessionDisplayResponse(
  raw: unknown
):
  | { ok: true; data: StripeSessionDisplayResponse }
  | { ok: false; error: z.ZodError<StripeSessionDisplayResponse> } {
  const r = stripeSessionDisplayResponseSchema.safeParse(raw);
  if (!r.success) {
    return { ok: false, error: r.error };
  }
  return { ok: true, data: r.data };
}
