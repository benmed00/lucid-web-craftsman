-- =====================================================
-- FIX 1: Extension in public schema (pg_net)
-- Note: pg_net doesn't support SET SCHEMA, so we need to:
-- 1. Drop the extension
-- 2. Create extensions schema
-- 3. Recreate in the proper schema
-- =====================================================

-- First create the extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop and recreate pg_net in extensions schema
DROP EXTENSION IF EXISTS pg_net CASCADE;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- =====================================================
-- FIX 2: Secure contact_messages_masked view
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS public.contact_messages_masked;

-- Recreate view with security_invoker = true (inherits RLS from base table)
CREATE VIEW public.contact_messages_masked
WITH (security_invoker = true)
AS
SELECT 
    contact_messages.id,
    (LEFT(contact_messages.first_name, 1) || '***') AS first_name,
    (LEFT(contact_messages.last_name, 1) || '***') AS last_name,
    (LEFT(contact_messages.email, 2) || '***@' || split_part(contact_messages.email, '@', 2)) AS email,
    CASE
        WHEN contact_messages.phone IS NOT NULL THEN ('***-' || RIGHT(regexp_replace(contact_messages.phone, '[^0-9]', '', 'g'), 4))
        ELSE NULL
    END AS phone,
    contact_messages.company,
    contact_messages.subject,
    (LEFT(contact_messages.message, 100) ||
        CASE
            WHEN LENGTH(contact_messages.message) > 100 THEN '...'
            ELSE ''
        END) AS message_preview,
    contact_messages.status,
    contact_messages.created_at,
    contact_messages.updated_at,
    NULL::inet AS ip_address
FROM contact_messages;

-- Grant select to authenticated users (RLS on contact_messages will still apply)
GRANT SELECT ON public.contact_messages_masked TO authenticated;

-- =====================================================
-- FIX 3: Create server-side admin verification function
-- =====================================================

-- Create or replace function to verify admin status server-side
-- This function cannot be spoofed via DevTools as it runs server-side
CREATE OR REPLACE FUNCTION public.verify_admin_session()
RETURNS TABLE (
    is_admin boolean,
    admin_role text,
    admin_name text,
    admin_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_admin boolean := false;
    v_role text := null;
    v_name text := null;
    v_email text := null;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- If no user, return not admin
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, null::text, null::text, null::text;
        RETURN;
    END IF;
    
    -- Check admin_users table directly (server-side, not spoofable)
    SELECT 
        true,
        au.role,
        au.name,
        au.email
    INTO v_is_admin, v_role, v_name, v_email
    FROM admin_users au
    WHERE au.user_id = v_user_id;
    
    RETURN QUERY SELECT 
        COALESCE(v_is_admin, false),
        v_role,
        v_name,
        v_email;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.verify_admin_session() TO authenticated;