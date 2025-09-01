-- Fix function search path security warnings by setting search_path explicitly
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger for status changes on significant statuses
  IF NEW.status IS DISTINCT FROM OLD.status 
     AND NEW.status IN ('paid', 'processing', 'shipped', 'delivered', 'cancelled') 
     AND OLD.status != NEW.status THEN
    
    -- Call the edge function to send notification
    PERFORM
      net.http_post(
        url := 'https://xcvlijchkmhjonhfildm.supabase.co/functions/v1/send-order-notification-improved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
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
$$;