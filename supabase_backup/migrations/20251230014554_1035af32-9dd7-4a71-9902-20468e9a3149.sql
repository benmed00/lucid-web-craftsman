-- =====================================================
-- CLEAN UP DUPLICATE FOREIGN KEY CONSTRAINTS
-- Remove auth.users references, keep profiles references
-- =====================================================

-- admin_users: keep fk_admin_users_profile, drop admin_users_user_id_fkey
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;

-- cart_items: keep fk_cart_items_user and fk_cart_items_product, drop duplicates
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

-- orders: keep fk_orders_user, drop orders_user_id_fkey
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- shipping_addresses: keep fk_shipping_addresses_user, drop shipping_addresses_user_id_fkey
ALTER TABLE public.shipping_addresses DROP CONSTRAINT IF EXISTS shipping_addresses_user_id_fkey;

-- product_reviews: keep fk_product_reviews_user and fk_product_reviews_product, drop duplicates
ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_user_id_fkey;
ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;

-- discount_coupons: keep fk_discount_coupons_created_by, drop discount_coupons_created_by_fkey
ALTER TABLE public.discount_coupons DROP CONSTRAINT IF EXISTS discount_coupons_created_by_fkey;

-- blog_posts: keep fk_blog_posts_author, drop blog_posts_author_id_fkey
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_id_fkey;

-- hero_images: keep fk_hero_images_created_by, drop hero_images_created_by_fkey
ALTER TABLE public.hero_images DROP CONSTRAINT IF EXISTS hero_images_created_by_fkey;

-- support_tickets: keep fk_support_tickets_user, drop support_tickets_user_id_fkey
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;

-- categories: keep fk_categories_parent, drop categories_parent_id_fkey
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;

-- product_categories: keep our new FKs, drop old duplicates
ALTER TABLE public.product_categories DROP CONSTRAINT IF EXISTS product_categories_category_id_fkey;
ALTER TABLE public.product_categories DROP CONSTRAINT IF EXISTS product_categories_product_id_fkey;

-- order_items: keep our new FKs, drop old duplicates
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- payments: keep fk_payments_order, drop payments_order_id_fkey
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_order_id_fkey;

-- shipments: keep fk_shipments_order, drop shipments_order_id_fkey
ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_order_id_fkey;

-- audit_logs: drop FK to auth.users (audit logs should persist even after user deletion)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;