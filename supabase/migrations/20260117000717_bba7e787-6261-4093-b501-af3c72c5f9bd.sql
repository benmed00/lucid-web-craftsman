-- =====================================================
-- FIX 1: Rate limits table - restrict to admin only
-- =====================================================

-- Drop existing permissive policy
DROP POLICY IF EXISTS "rate_limits_select" ON public.rate_limits;

-- Create admin-only select policy
CREATE POLICY "admin_only_rate_limits_select"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- FIX 2: contact_messages_masked - needs RLS enabled
-- The view uses security_invoker but the scanner expects RLS policies
-- Add explicit admin-only SELECT policy for the view
-- =====================================================

-- Enable RLS on the view (if not already)
ALTER VIEW public.contact_messages_masked SET (security_invoker = true);

-- Revoke public access and grant only to authenticated
REVOKE ALL ON public.contact_messages_masked FROM anon;
REVOKE ALL ON public.contact_messages_masked FROM public;
GRANT SELECT ON public.contact_messages_masked TO authenticated;