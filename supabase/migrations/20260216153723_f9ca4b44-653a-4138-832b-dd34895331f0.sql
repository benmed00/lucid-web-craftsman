-- Create a table for notification settings to handle auth safely
CREATE TABLE IF NOT EXISTS public.notification_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but restrict all access (internal only)
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Shared secret for internal trigger -> edge function calls
-- This is more robust than trying to use service_role_key in SQL sessions
INSERT INTO public.notification_settings (key, value) 
VALUES ('internal_shared_secret', gen_random_uuid()::text)
ON CONFLICT (key) DO NOTHING;

-- Improve the trigger function
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  shared_secret TEXT;
  target_url TEXT;
BEGIN
  -- Only trigger for significant status changes
  IF NEW.status IS DISTINCT FROM OLD.status 
     AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    
    -- Get shared secret
    SELECT value INTO shared_secret FROM public.notification_settings WHERE key = 'internal_shared_secret';
    
    -- Target improved orchestrator
    target_url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/send-order-notification-improved';

    -- Async call using pg_net
    PERFORM
      net.http_post(
        url := target_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Internal-Secret', shared_secret
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

-- Ensure the trigger is attached (re-create if needed)
DROP TRIGGER IF EXISTS trigger_notify_order_status_change ON public.orders;
CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();
