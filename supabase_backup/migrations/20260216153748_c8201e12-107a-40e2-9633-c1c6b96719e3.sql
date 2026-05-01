-- Re-create table and set fixed secret
CREATE TABLE IF NOT EXISTS public.notification_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fix linter info: add a dummy policy (no access even to admins via standard RLS)
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Internal only access" ON public.notification_settings;
CREATE POLICY "Internal only access" ON public.notification_settings FOR ALL USING (false);

INSERT INTO public.notification_settings (key, value) 
VALUES ('internal_shared_secret', 'rif_straw_internal_secure_notify_2026_v1')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update trigger function to use the fixed secret
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  target_url TEXT;
BEGIN
  -- Only trigger for significant status changes
  IF NEW.status IS DISTINCT FROM OLD.status 
     AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    
    target_url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/send-order-notification-improved';

    -- Call orchestrator with the internal secret
    PERFORM
      net.http_post(
        url := target_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Internal-Secret', 'rif_straw_internal_secure_notify_2026_v1'
        ),
        body := jsonb_build_object(
          'order_id', NEW.id::text,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
  END IF;
  
  RETURN NEW;
END;
$function$;
