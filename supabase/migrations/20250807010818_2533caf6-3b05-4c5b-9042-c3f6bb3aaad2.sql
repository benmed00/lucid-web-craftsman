-- Fix admin authentication security issues
-- Update admin_users table to work with Supabase auth
-- Remove password_hash since we'll use Supabase auth instead

-- First, let's add user_id column to link with auth.users
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id unique to ensure one admin record per auth user
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_user_id_unique'
    ) THEN
        ALTER TABLE public.admin_users 
        ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

-- Drop password_hash column as it's insecure and unnecessary with Supabase auth
ALTER TABLE public.admin_users 
DROP COLUMN IF EXISTS password_hash;

-- Update RLS policies to use proper auth.uid() instead of JWT claims
DROP POLICY IF EXISTS "Admin users can view their own data" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can update their own data" ON public.admin_users;

-- Create new secure RLS policies
CREATE POLICY "Admin users can view their own data" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin users can update their own data" 
ON public.admin_users 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their admin profile
CREATE POLICY "Users can create admin profile" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);