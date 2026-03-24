# Changelog

Notable behavior fixes and operational notes. For day-to-day commands and CI, see [STANDARDS.md](./STANDARDS.md) and [AGENTS.md](../AGENTS.md).

## 2026-03

### Admin order coupons — `usage_count`

When staff apply a coupon to an order from the dashboard, **`bumpDiscountCouponUsageCountByCode`** (`src/services/adminOrderUiApi.ts`) loads the current **`usage_count`** from `discount_coupons`, increments it, and writes it back. That keeps **`usage_limit`** enforcement in checkout (`validate_coupon_code` / client-side checks) aligned with real redemptions tied to orders.

### Wishlist Realtime channel naming

Browser Realtime subscriptions for wishlist use the channel id **`lwc-wishlist-<userId>`** so client topics are prefixed and easy to distinguish from other channels.
