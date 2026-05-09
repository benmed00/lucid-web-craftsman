/**
 * Cart payloads persisted on checkout sessions and edge payloads are JSON-shaped.
 * Use `CheckoutCartItemsJson` for DB rows; keep client cart types next to hooks/services.
 */
export type { CheckoutCartItemsJson } from './checkout';
