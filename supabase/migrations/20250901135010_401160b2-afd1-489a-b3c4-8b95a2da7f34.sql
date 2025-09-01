-- Create function to get customer segments without auth.users access issues
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

-- Enable realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.orders;