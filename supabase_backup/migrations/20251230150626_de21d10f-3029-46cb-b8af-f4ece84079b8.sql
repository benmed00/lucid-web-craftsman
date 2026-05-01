-- =============================================
-- PERFORMANCE OPTIMIZATION: Fix RLS Init Plan Issues
-- Replace auth.uid() with (select auth.uid()) in all RLS policies
-- =============================================

-- shipping_addresses table
DROP POLICY IF EXISTS "strict_shipping_update" ON public.shipping_addresses;
CREATE POLICY "strict_shipping_update" ON public.shipping_addresses
FOR UPDATE USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "strict_shipping_delete" ON public.shipping_addresses;
CREATE POLICY "strict_shipping_delete" ON public.shipping_addresses
FOR DELETE USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admin_shipping_select" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Admins can view all shipping addresses" ON public.shipping_addresses;
CREATE POLICY "admin_shipping_select" ON public.shipping_addresses
FOR SELECT USING (is_admin_user((select auth.uid())));

DROP POLICY IF EXISTS "strict_shipping_select" ON public.shipping_addresses;
CREATE POLICY "strict_shipping_select" ON public.shipping_addresses
FOR SELECT USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

DROP POLICY IF EXISTS "strict_shipping_insert" ON public.shipping_addresses;
CREATE POLICY "strict_shipping_insert" ON public.shipping_addresses
FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id);

-- newsletter_subscriptions table
DROP POLICY IF EXISTS "strict_newsletter_user_select" ON public.newsletter_subscriptions;
CREATE POLICY "strict_newsletter_user_select" ON public.newsletter_subscriptions
FOR SELECT USING (user_owns_newsletter_subscription(email));

DROP POLICY IF EXISTS "strict_newsletter_user_update" ON public.newsletter_subscriptions;
CREATE POLICY "strict_newsletter_user_update" ON public.newsletter_subscriptions
FOR UPDATE USING (user_owns_newsletter_subscription(email));

DROP POLICY IF EXISTS "Admins can view all newsletter subscriptions" ON public.newsletter_subscriptions;
CREATE POLICY "Admins can view all newsletter subscriptions" ON public.newsletter_subscriptions
FOR SELECT USING (is_admin_user((select auth.uid())));

-- profiles table
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
CREATE POLICY "users_can_update_own_profile" ON public.profiles
FOR UPDATE USING (is_authenticated_user() AND (select auth.uid()) = id)
WITH CHECK (is_authenticated_user() AND (select auth.uid()) = id);

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;
CREATE POLICY "users_can_view_own_profile" ON public.profiles
FOR SELECT USING (is_authenticated_user() AND (select auth.uid()) = id);

DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
FOR SELECT USING (is_admin_user((select auth.uid())));

DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
CREATE POLICY "users_can_insert_own_profile" ON public.profiles
FOR INSERT WITH CHECK (is_authenticated_user() AND (select auth.uid()) = id);

-- contact_messages table
DROP POLICY IF EXISTS "secure_admin_contact_access" ON public.contact_messages;
DROP POLICY IF EXISTS "admin_contact_update" ON public.contact_messages;
DROP POLICY IF EXISTS "admin_contact_delete" ON public.contact_messages;
DROP POLICY IF EXISTS "Only admins can update contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Only admins can delete contact messages" ON public.contact_messages;

CREATE POLICY "secure_admin_contact_access" ON public.contact_messages
FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "admin_contact_update" ON public.contact_messages
FOR UPDATE USING (is_admin_user((select auth.uid())));

CREATE POLICY "admin_contact_delete" ON public.contact_messages
FOR DELETE USING (is_admin_user((select auth.uid())));

-- user_preferences table
DROP POLICY IF EXISTS "authenticated_users_can_view_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "admins_can_view_all_preferences" ON public.user_preferences;

CREATE POLICY "authenticated_users_can_view_own_preferences" ON public.user_preferences
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_insert_own_preferences" ON public.user_preferences
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_update_own_preferences" ON public.user_preferences
FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_delete_own_preferences" ON public.user_preferences
FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "admins_can_view_all_preferences" ON public.user_preferences
FOR SELECT USING (is_admin_user((select auth.uid())));

-- user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can grant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can revoke roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Super admins can view all roles" ON public.user_roles
FOR SELECT USING (has_role((select auth.uid()), 'super_admin'));

CREATE POLICY "Super admins can grant roles" ON public.user_roles
FOR INSERT WITH CHECK (has_role((select auth.uid()), 'super_admin'));

CREATE POLICY "Super admins can revoke roles" ON public.user_roles
FOR UPDATE USING (has_role((select auth.uid()), 'super_admin'));

-- notification_preferences table
DROP POLICY IF EXISTS "authenticated_users_can_view_own_notifications" ON public.notification_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_insert_own_notifications" ON public.notification_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_update_own_notifications" ON public.notification_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_delete_own_notifications" ON public.notification_preferences;

CREATE POLICY "authenticated_users_can_view_own_notifications" ON public.notification_preferences
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_insert_own_notifications" ON public.notification_preferences
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_update_own_notifications" ON public.notification_preferences
FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "authenticated_users_can_delete_own_notifications" ON public.notification_preferences
FOR DELETE USING ((select auth.uid()) = user_id);

-- products table
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

CREATE POLICY "Admins can delete products" ON public.products
FOR DELETE USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can insert products" ON public.products
FOR INSERT WITH CHECK (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update products" ON public.products
FOR UPDATE USING (is_admin_user((select auth.uid())));

-- orders table
DROP POLICY IF EXISTS "Super admins can select all orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can update all orders" ON public.orders;

CREATE POLICY "Super admins can select all orders" ON public.orders
FOR SELECT USING (has_role((select auth.uid()), 'super_admin'));

CREATE POLICY "Super admins can update all orders" ON public.orders
FOR UPDATE USING (has_role((select auth.uid()), 'super_admin'));

-- payments table
DROP POLICY IF EXISTS "Super admins can view all payments" ON public.payments;

CREATE POLICY "Super admins can view all payments" ON public.payments
FOR SELECT USING (has_role((select auth.uid()), 'super_admin'));

-- security_config table
DROP POLICY IF EXISTS "Super admins can manage security config" ON public.security_config;

CREATE POLICY "Super admins can manage security config" ON public.security_config
FOR ALL USING (has_role((select auth.uid()), 'super_admin'));

-- security_events table
DROP POLICY IF EXISTS "deny_anonymous_security_events_access" ON public.security_events;
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Admins can update security events" ON public.security_events;

CREATE POLICY "Admins can view security events" ON public.security_events
FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update security events" ON public.security_events
FOR UPDATE USING (is_admin_user((select auth.uid())));

-- rate_limits table
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;

CREATE POLICY "Admins can manage rate limits" ON public.rate_limits
FOR ALL USING (is_admin_user((select auth.uid())));

-- app_settings table
DROP POLICY IF EXISTS "Only admins can manage app settings" ON public.app_settings;

CREATE POLICY "Only admins can manage app settings" ON public.app_settings
FOR ALL USING (is_admin_user((select auth.uid())));

-- email_logs table
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can update email logs" ON public.email_logs;

CREATE POLICY "Admins can view email logs" ON public.email_logs
FOR SELECT USING (is_admin_user((select auth.uid())));

CREATE POLICY "Admins can update email logs" ON public.email_logs
FOR UPDATE USING (is_admin_user((select auth.uid())));

-- email_ab_tests table
DROP POLICY IF EXISTS "Admins can manage A/B tests" ON public.email_ab_tests;

CREATE POLICY "Admins can manage A/B tests" ON public.email_ab_tests
FOR ALL USING (is_admin_user((select auth.uid())));

-- scheduled_emails table
DROP POLICY IF EXISTS "Admins can manage scheduled emails" ON public.scheduled_emails;

CREATE POLICY "Admins can manage scheduled emails" ON public.scheduled_emails
FOR ALL USING (is_admin_user((select auth.uid())));

-- admin_users table
DROP POLICY IF EXISTS "super_admin_only_select" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_only_insert" ON public.admin_users;
DROP POLICY IF EXISTS "super_admin_only_update" ON public.admin_users;

CREATE POLICY "super_admin_only_select" ON public.admin_users
FOR SELECT USING (has_role((select auth.uid()), 'super_admin'));

CREATE POLICY "super_admin_only_insert" ON public.admin_users
FOR INSERT WITH CHECK (has_role((select auth.uid()), 'super_admin'));

CREATE POLICY "super_admin_only_update" ON public.admin_users
FOR UPDATE USING (has_role((select auth.uid()), 'super_admin'))
WITH CHECK (has_role((select auth.uid()), 'super_admin'));

-- support_tickets_error_reports table
DROP POLICY IF EXISTS "Authenticated users can view only their own error reports" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "Anonymous users can view their own error reports by email" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "Admins can manage all error reports" ON public.support_tickets_error_reports;

CREATE POLICY "Authenticated users can view only their own error reports" ON public.support_tickets_error_reports
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all error reports" ON public.support_tickets_error_reports
FOR ALL USING (is_admin_user((select auth.uid())));