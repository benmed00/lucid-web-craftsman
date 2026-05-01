-- Fix RLS policies to prevent recursive issues

-- Fix newsletter subscriptions RLS policy
DROP POLICY IF EXISTS "Users can view their own newsletter subscription" ON public.newsletter_subscriptions;
DROP POLICY IF EXISTS "Users can update their own newsletter subscription" ON public.newsletter_subscriptions;

-- Create proper RLS policies for newsletter subscriptions
CREATE POLICY "Admins can view all newsletter subscriptions" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (is_admin_user(auth.uid()));

CREATE POLICY "Users can view newsletter by email" 
ON public.newsletter_subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
);

CREATE POLICY "Users can update newsletter by email" 
ON public.newsletter_subscriptions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.email = newsletter_subscriptions.email
  )
);

-- Create a function to get customer segments without accessing auth.users directly
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
  returning_customers integer := 0;
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
  
  -- Get returning customers (have more than 1 order)
  SELECT COUNT(*) INTO returning_customers
  FROM (
    SELECT user_id
    FROM orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS returning;
  
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
    'returning', returning_customers,
    'at_risk', at_risk_customers
  );

  RETURN result;
END;
$$;