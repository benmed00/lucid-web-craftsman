-- Fix function search path security issues
-- Update existing functions to have secure search_path

ALTER FUNCTION public.is_admin_user(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.handle_new_user() 
SET search_path = 'public';

ALTER FUNCTION public.add_admin_user(uuid, text, text, boolean) 
SET search_path = 'public';

ALTER FUNCTION public.init_loyalty_account(uuid) 
SET search_path = 'public';

ALTER FUNCTION public.add_loyalty_points(uuid, integer, text, text, text, text) 
SET search_path = 'public';

ALTER FUNCTION public.update_loyalty_tier(uuid) 
SET search_path = 'public';