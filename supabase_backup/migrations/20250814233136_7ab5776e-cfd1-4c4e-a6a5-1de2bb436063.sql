-- Fix the circular dependency in admin_users RLS policies
-- Allow users to read their own admin record to determine if they have admin privileges

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can select admin users" ON public.admin_users;

-- Create a new policy that allows users to read their own admin record
CREATE POLICY "Users can view their own admin status"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Keep the admin-only policies for insert and update
-- These ensure only existing admins can manage other admin users