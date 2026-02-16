
-- Fix overly permissive RLS on rate_limits table
-- The check_rate_limit() function is SECURITY DEFINER so it bypasses RLS.
-- We can safely restrict direct client access.

-- Drop the overly permissive public-role policies
DROP POLICY IF EXISTS "rate_limits_insert" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_update" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_delete" ON public.rate_limits;
DROP POLICY IF EXISTS "System can insert rate limits via functions" ON public.rate_limits;

-- Only admins can directly insert/update/delete rate limits
-- (check_rate_limit SECURITY DEFINER function still works as it bypasses RLS)
CREATE POLICY "rate_limits_admin_insert" ON public.rate_limits
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "rate_limits_admin_update" ON public.rate_limits
  FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "rate_limits_admin_delete" ON public.rate_limits
  FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));
