CREATE OR REPLACE FUNCTION public.rotate_guest_token(_old_guest_id text, _old_signature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _new_guest_id text;
  _new_signature text;
  _secret text;
  _migrated int := 0;
  _valid boolean := false;
BEGIN
  _new_guest_id := gen_random_uuid()::text;
  _secret := COALESCE(
    current_setting('app.settings.guest_token_secret', true),
    'default-guest-secret-change-in-production'
  );
  _new_signature := encode(
    extensions.hmac(_new_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );

  -- Validate old token (may be null on first call, that's fine — just no migration)
  IF _old_guest_id IS NOT NULL AND _old_signature IS NOT NULL THEN
    _valid := public.validate_guest_token(_old_guest_id, _old_signature);
  END IF;

  IF _valid THEN
    UPDATE public.checkout_sessions
       SET guest_id = _new_guest_id,
           updated_at = now()
     WHERE guest_id = _old_guest_id
       AND status NOT IN ('completed', 'abandoned');
    GET DIAGNOSTICS _migrated = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'guest_id', _new_guest_id,
    'signature', _new_signature,
    'expires_at', (now() + interval '24 hours')::text,
    'migrated_sessions', _migrated,
    'old_token_valid', _valid
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rotate_guest_token(text, text) TO anon, authenticated;