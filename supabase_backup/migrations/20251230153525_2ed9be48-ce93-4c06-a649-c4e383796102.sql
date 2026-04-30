-- =============================================
-- FIX: Multiple Permissive Policies & Duplicate Indexes
-- =============================================

-- 1. DUPLICATE INDEXES - Drop duplicate indexes
-- product_categories table
DROP INDEX IF EXISTS idx_product_categories_category;
DROP INDEX IF EXISTS idx_product_categories_product;

-- product_reviews table  
DROP INDEX IF EXISTS idx_reviews_product_id;
DROP INDEX IF EXISTS idx_reviews_user_id;

-- 2. APP_SETTINGS - Consolidate policies
DROP POLICY IF EXISTS "App settings are publicly readable" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can manage app settings" ON public.app_settings;

CREATE POLICY "app_settings_select_policy" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "app_settings_admin_modify" ON public.app_settings
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 3. BLOG_POSTS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Authors can manage their own blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Published blog posts are publicly readable" ON public.blog_posts;

CREATE POLICY "blog_posts_select_policy" ON public.blog_posts
  FOR SELECT USING (
    status = 'published' 
    OR author_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "blog_posts_insert_policy" ON public.blog_posts
  FOR INSERT WITH CHECK (
    author_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "blog_posts_update_policy" ON public.blog_posts
  FOR UPDATE USING (
    author_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "blog_posts_delete_policy" ON public.blog_posts
  FOR DELETE USING (
    author_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

-- 4. CATEGORIES - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are publicly readable" ON public.categories;

CREATE POLICY "categories_select_policy" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin_modify" ON public.categories
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 5. DISCOUNT_COUPONS - Consolidate policies
DROP POLICY IF EXISTS "Active coupons are publicly readable" ON public.discount_coupons;
DROP POLICY IF EXISTS "Admins can manage discount coupons" ON public.discount_coupons;

CREATE POLICY "discount_coupons_select_policy" ON public.discount_coupons
  FOR SELECT USING (is_active = true OR public.is_user_admin((select auth.uid())));

CREATE POLICY "discount_coupons_admin_modify" ON public.discount_coupons
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 6. HERO_IMAGES - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage hero images" ON public.hero_images;
DROP POLICY IF EXISTS "Public can view active hero images" ON public.hero_images;

CREATE POLICY "hero_images_select_policy" ON public.hero_images
  FOR SELECT USING (is_active = true OR public.is_user_admin((select auth.uid())));

CREATE POLICY "hero_images_admin_modify" ON public.hero_images
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 7. LOYALTY_POINTS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "System can insert loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "System can update loyalty points" ON public.loyalty_points;
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON public.loyalty_points;

CREATE POLICY "loyalty_points_select_policy" ON public.loyalty_points
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "loyalty_points_modify_policy" ON public.loyalty_points
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 8. LOYALTY_REDEMPTIONS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "System can update loyalty redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can insert their own redemptions" ON public.loyalty_redemptions;
DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.loyalty_redemptions;

CREATE POLICY "loyalty_redemptions_select_policy" ON public.loyalty_redemptions
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "loyalty_redemptions_insert_policy" ON public.loyalty_redemptions
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "loyalty_redemptions_admin_modify" ON public.loyalty_redemptions
  FOR UPDATE USING (public.is_user_admin((select auth.uid())));

CREATE POLICY "loyalty_redemptions_admin_delete" ON public.loyalty_redemptions
  FOR DELETE USING (public.is_user_admin((select auth.uid())));

-- 9. LOYALTY_REWARDS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage loyalty rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Loyalty rewards are publicly readable" ON public.loyalty_rewards;

CREATE POLICY "loyalty_rewards_select_policy" ON public.loyalty_rewards
  FOR SELECT USING (true);

CREATE POLICY "loyalty_rewards_admin_modify" ON public.loyalty_rewards
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 10. LOYALTY_TRANSACTIONS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "System can insert loyalty transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Users can view their own loyalty transactions" ON public.loyalty_transactions;

CREATE POLICY "loyalty_transactions_select_policy" ON public.loyalty_transactions
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "loyalty_transactions_modify_policy" ON public.loyalty_transactions
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 11. NEWSLETTER_SUBSCRIPTIONS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Admins can view all newsletter subscriptions" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Prevent unauthorized deletion" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "strict_newsletter_user_select" ON public.newsletter_subscriptions;

CREATE POLICY "newsletter_insert_policy" ON public.newsletter_subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "newsletter_select_policy" ON public.newsletter_subscriptions
  FOR SELECT USING (
    public.user_owns_newsletter_subscription(email) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "newsletter_update_policy" ON public.newsletter_subscriptions
  FOR UPDATE USING (
    public.user_owns_newsletter_subscription(email) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "newsletter_delete_policy" ON public.newsletter_subscriptions
  FOR DELETE USING (public.is_user_admin((select auth.uid())));

-- 12. PRODUCTS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;

CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "products_admin_modify" ON public.products
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 13. PROFILES - Consolidate policies
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

-- 14. RATE_LIMITS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "System can insert rate limits" ON public.rate_limits;

CREATE POLICY "rate_limits_policy" ON public.rate_limits
  FOR ALL USING (true);

-- 15. SCHEDULED_EMAILS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage scheduled emails" ON public.scheduled_emails;
DROP POLICY IF EXISTS "System can insert scheduled emails" ON public.scheduled_emails;
DROP POLICY IF EXISTS "System can update scheduled emails" ON public.scheduled_emails;

CREATE POLICY "scheduled_emails_select_policy" ON public.scheduled_emails
  FOR SELECT USING (public.is_user_admin((select auth.uid())));

CREATE POLICY "scheduled_emails_modify_policy" ON public.scheduled_emails
  FOR ALL USING (true);

-- 16. SHIPMENTS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;

CREATE POLICY "shipments_select_policy" ON public.shipments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = shipments.order_id 
      AND orders.user_id = (select auth.uid())
    )
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "shipments_admin_modify" ON public.shipments
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 17. SHIPPING_ADDRESSES - Consolidate policies
DROP POLICY IF EXISTS "admin_shipping_select" ON public.shipping_addresses;
DROP POLICY IF EXISTS "strict_shipping_select" ON public.shipping_addresses;

CREATE POLICY "shipping_addresses_select_policy" ON public.shipping_addresses
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

-- 18. SHIPPING_ZONES - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Shipping zones are publicly readable" ON public.shipping_zones;

CREATE POLICY "shipping_zones_select_policy" ON public.shipping_zones
  FOR SELECT USING (true);

CREATE POLICY "shipping_zones_admin_modify" ON public.shipping_zones
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 19. SUPPORT_TICKET_MESSAGES - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can view messages from their tickets" ON public.support_ticket_messages;

CREATE POLICY "support_ticket_messages_select_policy" ON public.support_ticket_messages
  FOR SELECT USING (
    public.can_access_support_ticket(ticket_id) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "support_ticket_messages_insert_policy" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    public.can_access_support_ticket(ticket_id) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "support_ticket_messages_admin_modify" ON public.support_ticket_messages
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 20. SUPPORT_TICKETS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Deny anonymous access to support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can insert tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update only their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view only their own support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

CREATE POLICY "support_tickets_select_policy" ON public.support_tickets
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "support_tickets_insert_policy" ON public.support_tickets
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "support_tickets_update_policy" ON public.support_tickets
  FOR UPDATE USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "support_tickets_delete_policy" ON public.support_tickets
  FOR DELETE USING (public.is_user_admin((select auth.uid())));

-- 21. SUPPORT_TICKETS_ERROR_REPORTS - Consolidate policies
DROP POLICY IF EXISTS "Admins can manage all error reports" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "Authenticated users can view only their own error reports" ON public.support_tickets_error_reports;
DROP POLICY IF EXISTS "Users can create error reports" ON public.support_tickets_error_reports;

CREATE POLICY "error_reports_select_policy" ON public.support_tickets_error_reports
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

CREATE POLICY "error_reports_insert_policy" ON public.support_tickets_error_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "error_reports_admin_modify" ON public.support_tickets_error_reports
  FOR ALL USING (public.is_user_admin((select auth.uid())));

-- 22. USER_PREFERENCES - Consolidate policies
DROP POLICY IF EXISTS "admins_can_view_all_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "authenticated_users_can_view_own_preferences" ON public.user_preferences;

CREATE POLICY "user_preferences_select_policy" ON public.user_preferences
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.is_user_admin((select auth.uid()))
  );

-- 23. USER_ROLES - Consolidate policies
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
  FOR SELECT USING (
    user_id = (select auth.uid()) 
    OR public.has_role((select auth.uid()), 'super_admin')
  );