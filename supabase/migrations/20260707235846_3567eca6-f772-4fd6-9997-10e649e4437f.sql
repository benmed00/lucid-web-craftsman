CREATE OR REPLACE FUNCTION public.create_guest_token()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _guest_id text;
  _signature text;
  _secret text;
BEGIN
  _guest_id := gen_random_uuid()::text;
  _secret := COALESCE(
    current_setting('app.settings.guest_token_secret', true),
    'default-guest-secret-change-in-production'
  );
  _signature := encode(
    extensions.hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  RETURN jsonb_build_object(
    'guest_id', _guest_id,
    'signature', _signature,
    'expires_at', (now() + interval '24 hours')::text
  );
END;
$function$;