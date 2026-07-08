CREATE OR REPLACE FUNCTION public.validate_guest_token(_guest_id text, _signature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    extensions.hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  RETURN _expected_sig = _signature;
END;
$function$;