-- Create function to handle order status changes and send notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS trigger_notify_order_status_change ON public.orders;
CREATE TRIGGER trigger_notify_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Update the get_customer_segments function to work correctly
DROP FUNCTION IF EXISTS public.get_customer_segments();
CREATE OR REPLACE FUNCTION public.get_customer_segments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_customers integer := 0;
  new_customers integer := 0;
  repeat_customers integer := 0;
  at_risk_customers integer := 0;
BEGIN
  -- Check if user is admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total customers from profiles
  SELECT COUNT(*) INTO total_customers FROM profiles;
  
  -- Get new customers (registered in last 30 days)
  SELECT COUNT(*) INTO new_customers 
  FROM profiles 
  WHERE created_at >= now() - interval '30 days';
  
  -- Get repeat customers (have more than 1 order)
  SELECT COUNT(*) INTO repeat_customers
  FROM (
    SELECT user_id
    FROM orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS repeats;
  
  -- Get at-risk customers (no orders in last 90 days but had orders before)
  SELECT COUNT(*) INTO at_risk_customers
  FROM (
    SELECT user_id
    FROM orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING MAX(created_at) < now() - interval '90 days'
  ) AS at_risk;

  result := jsonb_build_object(
    'total', total_customers,
    'new', new_customers,
    'returning', repeat_customers,
    'at_risk', at_risk_customers
  );

  RETURN result;
END;
$$;