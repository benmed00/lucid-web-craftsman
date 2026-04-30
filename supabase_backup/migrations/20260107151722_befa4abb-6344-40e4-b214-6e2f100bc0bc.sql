-- Fix: Change view to use SECURITY INVOKER (default, more secure)
-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.contact_messages_masked;

CREATE VIEW public.contact_messages_masked 
WITH (security_invoker = true)
AS
SELECT 
  id,
  LEFT(first_name, 1) || '***' AS first_name,
  LEFT(last_name, 1) || '***' AS last_name,
  LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2) AS email,
  CASE 
    WHEN phone IS NOT NULL THEN '***-' || RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 4)
    ELSE NULL 
  END AS phone,
  company,
  subject,
  LEFT(message, 100) || CASE WHEN LENGTH(message) > 100 THEN '...' ELSE '' END AS message_preview,
  status,
  created_at,
  updated_at,
  NULL::inet AS ip_address
FROM public.contact_messages;

-- Grant access to the masked view for admins (RLS on base table still applies)
GRANT SELECT ON public.contact_messages_masked TO authenticated;