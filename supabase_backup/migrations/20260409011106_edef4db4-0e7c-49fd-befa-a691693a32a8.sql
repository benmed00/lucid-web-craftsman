
-- ============================================================
-- 1. REALTIME: Add RLS policies on realtime.messages
-- ============================================================

-- Policy: Users can only read messages from channels matching their user ID
CREATE POLICY "users_read_own_realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow if the topic/extension contains the user's ID, or user is admin
  is_admin_user((SELECT auth.uid())) 
  OR realtime.topic() = CONCAT('private:', (SELECT auth.uid())::text)
);

-- Block anonymous from realtime messages
CREATE POLICY "block_anon_realtime"
ON realtime.messages
FOR SELECT
TO anon
USING (false);

-- ============================================================
-- 2. STORAGE: Fix error-screenshots SELECT (remove broad policy, keep admin-only)
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view error screenshots" ON storage.objects;

-- Replace with path-scoped policy: users can only see their own uploads
CREATE POLICY "Users can view own error screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'error-screenshots' 
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR is_admin_user((SELECT auth.uid()))
  )
);

-- ============================================================
-- 3. STORAGE: Fix review-photos INSERT (enforce path ownership)
-- ============================================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can upload review photos" ON storage.objects;

-- Replace with path-scoped INSERT
CREATE POLICY "Users can upload own review photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'review-photos'
  AND (SELECT auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- ============================================================
-- 4. GUEST SESSION: Server-signed guest tokens
-- ============================================================

-- Create function to generate a signed guest token
CREATE OR REPLACE FUNCTION public.create_guest_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest_id text;
  _signature text;
  _secret text;
BEGIN
  _guest_id := gen_random_uuid()::text;
  
  -- Use a server-side secret for HMAC signing
  _secret := COALESCE(
    current_setting('app.settings.guest_token_secret', true),
    'default-guest-secret-change-in-production'
  );
  
  _signature := encode(
    hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  
  RETURN jsonb_build_object(
    'guest_id', _guest_id,
    'signature', _signature,
    'expires_at', (now() + interval '24 hours')::text
  );
END;
$$;

-- Create function to validate a guest token
CREATE OR REPLACE FUNCTION public.validate_guest_token(_guest_id text, _signature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
  _expected_sig text;
BEGIN
  IF _guest_id IS NULL OR _signature IS NULL THEN
    RETURN false;
  END IF;

  _secret := COALESCE(
    current_setting('app.settings.guest_token_secret', true),
    'default-guest-secret-change-in-production'
  );
  
  _expected_sig := encode(
    hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  
  RETURN _expected_sig = _signature;
END;
$$;

-- Update get_request_guest_id to validate signature
CREATE OR REPLACE FUNCTION public.get_request_guest_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _guest_id text;
  _signature text;
BEGIN
  _guest_id := current_setting('request.headers', true)::json->>'x-guest-id';
  _signature := current_setting('request.headers', true)::json->>'x-guest-signature';
  
  IF _guest_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If signature is provided, validate it
  IF _signature IS NOT NULL THEN
    IF NOT validate_guest_token(_guest_id, _signature) THEN
      RETURN NULL; -- Invalid signature, reject
    END IF;
  END IF;
  
  RETURN _guest_id;
END;
$$;

-- Grant execute on guest token functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.create_guest_token() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_guest_token(text, text) TO anon, authenticated;
