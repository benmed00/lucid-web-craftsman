
-- Fix handle_new_user trigger to populate profile fields from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        phone
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    );
    
    RETURN NEW;
END;
$function$;
