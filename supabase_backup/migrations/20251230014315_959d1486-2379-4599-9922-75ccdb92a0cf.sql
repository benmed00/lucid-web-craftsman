-- =====================================================
-- LOW-PRIORITY FOREIGN KEY CONSTRAINTS
-- Audit, Security, and Admin tables
-- =====================================================

-- admin_users -> profiles (user_id) - links admin to their profile
ALTER TABLE public.admin_users
  ADD CONSTRAINT fk_admin_users_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- user_roles -> profiles (user_id) - links roles to profiles
ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- user_roles -> profiles (granted_by) - who granted the role
ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_granted_by
  FOREIGN KEY (granted_by) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- hero_images -> profiles (created_by)
ALTER TABLE public.hero_images
  ADD CONSTRAINT fk_hero_images_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- discount_coupons -> profiles (created_by)
ALTER TABLE public.discount_coupons
  ADD CONSTRAINT fk_discount_coupons_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- security_config -> profiles (created_by)
ALTER TABLE public.security_config
  ADD CONSTRAINT fk_security_config_created_by
  FOREIGN KEY (created_by) REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Create indexes for foreign key columns
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON public.user_roles(granted_by);
CREATE INDEX IF NOT EXISTS idx_hero_images_created_by ON public.hero_images(created_by);
CREATE INDEX IF NOT EXISTS idx_discount_coupons_created_by ON public.discount_coupons(created_by);
CREATE INDEX IF NOT EXISTS idx_security_config_created_by ON public.security_config(created_by);

-- Note: audit_logs and security_events intentionally do NOT have FK constraints
-- on user_id because:
-- 1. They need to retain logs even if the user is deleted (audit trail)
-- 2. System/anonymous actions may have NULL user_id
-- 3. Performance: high-volume logging tables shouldn't have FK overhead