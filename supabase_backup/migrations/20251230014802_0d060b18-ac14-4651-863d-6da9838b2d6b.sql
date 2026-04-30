-- =====================================================
-- ADD EXPLICIT ANONYMOUS DENIAL RLS POLICIES
-- Fixes ERROR-level security findings
-- =====================================================

-- 1. CONTACT_MESSAGES - Deny all anonymous access
CREATE POLICY "deny_anonymous_contact_access"
ON public.contact_messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. PROFILES - Deny all anonymous access
CREATE POLICY "deny_anonymous_profile_access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 3. SHIPPING_ADDRESSES - Deny all anonymous access
CREATE POLICY "deny_anonymous_shipping_access"
ON public.shipping_addresses
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 4. SUPPORT_TICKETS - Deny all anonymous access
CREATE POLICY "deny_anonymous_support_tickets_access"
ON public.support_tickets
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 5. SUPPORT_TICKETS_ERROR_REPORTS - Deny anonymous access (fix weak policy)
DROP POLICY IF EXISTS "Anonymous users can view by email from JWT" ON public.support_tickets_error_reports;
CREATE POLICY "deny_anonymous_error_reports_access"
ON public.support_tickets_error_reports
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 6. NEWSLETTER_SUBSCRIPTIONS - Strengthen anonymous access
-- Keep anonymous INSERT for signups, but deny SELECT/UPDATE/DELETE
CREATE POLICY "deny_anonymous_newsletter_read"
ON public.newsletter_subscriptions
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);

CREATE POLICY "deny_anonymous_newsletter_update"
ON public.newsletter_subscriptions
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false);

-- 7. USER_PREFERENCES - Deny all anonymous access
CREATE POLICY "deny_anonymous_user_preferences_access"
ON public.user_preferences
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 8. NOTIFICATION_PREFERENCES - Deny all anonymous access  
CREATE POLICY "deny_anonymous_notification_prefs_access"
ON public.notification_preferences
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 9. SUPPORT_TICKET_MESSAGES - Deny all anonymous access
CREATE POLICY "deny_anonymous_ticket_messages_access"
ON public.support_ticket_messages
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 10. LOYALTY_POINTS - Deny all anonymous access
CREATE POLICY "deny_anonymous_loyalty_points_access"
ON public.loyalty_points
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 11. LOYALTY_TRANSACTIONS - Deny all anonymous access
CREATE POLICY "deny_anonymous_loyalty_transactions_access"
ON public.loyalty_transactions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 12. LOYALTY_REDEMPTIONS - Deny all anonymous access
CREATE POLICY "deny_anonymous_loyalty_redemptions_access"
ON public.loyalty_redemptions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 13. WISHLIST - Deny all anonymous access
CREATE POLICY "deny_anonymous_wishlist_access"
ON public.wishlist
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 14. CART_ITEMS - Deny all anonymous access
CREATE POLICY "deny_anonymous_cart_access"
ON public.cart_items
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 15. ORDERS - Deny all anonymous access
CREATE POLICY "deny_anonymous_orders_access"
ON public.orders
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 16. ORDER_ITEMS - Deny all anonymous access
CREATE POLICY "deny_anonymous_order_items_access"
ON public.order_items
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);