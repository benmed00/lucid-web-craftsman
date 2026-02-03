-- Fix RLS: Change block_anon to only apply to authenticated role (not anon)
-- The current policy blocks ALL access with false, which is too restrictive

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "checkout_sessions_block_anon" ON public.checkout_sessions;

-- Add a proper guest select policy so guests can read their own sessions
CREATE POLICY "checkout_sessions_guest_select" 
ON public.checkout_sessions 
FOR SELECT 
USING (guest_id IS NOT NULL);