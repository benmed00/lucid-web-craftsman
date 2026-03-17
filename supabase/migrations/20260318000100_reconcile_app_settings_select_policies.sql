-- Reconcile app_settings SELECT policies after merging latest main.
-- Goal:
--   1) allow anon/authenticated reads for explicit storefront-safe keys
--   2) allow admins to read all keys
--   3) keep all write operations admin-only (unchanged)

DROP POLICY IF EXISTS "app_settings_select_admin_only" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_restricted_keys_v2" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_anon_safe_keys_v2" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_authenticated" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select" ON public.app_settings;

CREATE POLICY "app_settings_select_safe_keys_v3"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (
  setting_key = ANY (
    ARRAY[
      'business_rules',
      'display_settings',
      'free_shipping_threshold'
    ]::text[]
  )
);

CREATE POLICY "app_settings_select_admin_all_v3"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_user_admin((SELECT auth.uid())));
