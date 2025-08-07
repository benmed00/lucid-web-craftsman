-- Fix admin authentication security issues
-- Update admin_users table to work with Supabase auth
-- Remove password_hash since we'll use Supabase auth instead

-- First, let's add user_id column to link with auth.users
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id unique to ensure one admin record per auth user
ALTER TABLE public.admin_users 
ADD CONSTRAINT IF NOT EXISTS admin_users_user_id_unique UNIQUE (user_id);

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

-- Create function to automatically create admin profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only create admin profile if email matches admin pattern
  -- You can customize this logic based on your needs
  IF NEW.email LIKE '%@admin.%' OR NEW.raw_user_meta_data->>'role' = 'admin' THEN
    INSERT INTO public.admin_users (user_id, email, name, role)
    VALUES (
      NEW.id, 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic admin profile creation
DROP TRIGGER IF EXISTS on_auth_admin_user_created ON auth.users;
CREATE TRIGGER on_auth_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_admin_user();