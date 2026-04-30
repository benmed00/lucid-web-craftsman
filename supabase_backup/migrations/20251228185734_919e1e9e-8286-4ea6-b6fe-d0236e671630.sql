-- Fix mask_email function: add immutable search_path
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT 
        SUBSTRING(email FROM 1 FOR 2) || 
        repeat('*', GREATEST(length(email) - 4, 0)) || 
        SUBSTRING(email FROM GREATEST(length(email) - 1, 1));
$$;

-- Fix handle_new_user function: add proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;