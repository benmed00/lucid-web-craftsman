-- ============================================================================
-- SECURITY FIX: Checkout Sessions & Profiles Data Protection (Part 2)
-- ============================================================================

-- 1. Create function to mask phone numbers (helper) FIRST
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN phone_number IS NULL OR LENGTH(phone_number) < 4 THEN phone_number
    ELSE SUBSTRING(phone_number FROM 1 FOR 3) || '****' || RIGHT(phone_number, 2)
  END
$$;

-- Also create version for varchar to handle both types
CREATE OR REPLACE FUNCTION public.mask_phone(phone_number varchar)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.mask_phone(phone_number::text)
$$;

-- 2. Add function to check if current user owns a profile
CREATE OR REPLACE FUNCTION public.is_profile_owner(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id
$$;

-- 3. Create masked view for profiles (for admin use - shows masked PII)
DROP VIEW IF EXISTS public.profiles_masked;
CREATE VIEW public.profiles_masked AS
SELECT 
  id,
  CASE 
    WHEN public.is_profile_owner(id) OR public.is_admin_user(auth.uid()) THEN full_name
    ELSE SUBSTRING(full_name FROM 1 FOR 2) || '***'
  END as full_name,
  CASE 
    WHEN public.is_profile_owner(id) THEN phone
    WHEN public.is_admin_user(auth.uid()) THEN public.mask_phone(phone::text)
    ELSE NULL
  END as phone,
  CASE 
    WHEN public.is_profile_owner(id) THEN address_line1
    ELSE '*** (hidden)'
  END as address_line1,
  CASE 
    WHEN public.is_profile_owner(id) THEN address_line2
    ELSE NULL
  END as address_line2,
  city,
  CASE 
    WHEN public.is_profile_owner(id) OR public.is_admin_user(auth.uid()) THEN postal_code
    ELSE SUBSTRING(postal_code FROM 1 FOR 2) || '***'
  END as postal_code,
  country,
  CASE 
    WHEN public.is_profile_owner(id) OR public.is_admin_user(auth.uid()) THEN bio
    ELSE NULL
  END as bio,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- 4. Update checkout_sessions to use encrypted personal_info (for future inserts)
-- Note: This adds a comment documenting that personal_info should be treated as sensitive
COMMENT ON COLUMN public.checkout_sessions.personal_info IS 'SENSITIVE: Contains customer PII (email, phone, name). Access restricted by RLS.';
COMMENT ON COLUMN public.checkout_sessions.shipping_info IS 'SENSITIVE: Contains customer address. Access restricted by RLS.';

-- 5. Create audit function for checkout session access by admins
CREATE OR REPLACE FUNCTION public.audit_checkout_session_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log admin access to checkout sessions with PII
  IF public.is_admin_user(auth.uid()) AND (NEW.personal_info IS NOT NULL OR NEW.shipping_info IS NOT NULL) THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'CHECKOUT_SESSION_PII_ACCESS',
      'checkout_session',
      NEW.id::text,
      jsonb_build_object(
        'accessed_at', now(),
        'has_personal_info', NEW.personal_info IS NOT NULL,
        'has_shipping_info', NEW.shipping_info IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;