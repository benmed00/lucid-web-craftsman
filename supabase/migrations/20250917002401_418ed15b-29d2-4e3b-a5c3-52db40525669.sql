-- Final batch: fix all remaining function search path security issues

CREATE OR REPLACE FUNCTION public.get_masked_error_report(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    report_record jsonb;
    user_owns_report boolean;
    is_admin_user boolean;
BEGIN
    -- Check if user owns this error report
    SELECT EXISTS (
        SELECT 1 FROM public.support_tickets_error_reports
        WHERE id = report_id AND user_id = auth.uid()
    ) INTO user_owns_report;
    
    -- Check if user is admin
    SELECT public.is_admin_user(auth.uid()) INTO is_admin_user;
    
    -- Only allow access if user owns report or is admin
    IF NOT (user_owns_report OR is_admin_user) THEN
        RAISE EXCEPTION 'Access denied to error report';
    END IF;
    
    -- Get error report record
    SELECT to_jsonb(r.*) INTO report_record
    FROM public.support_tickets_error_reports r
    WHERE r.id = report_id;
    
    -- For non-admin users, mask the email address
    IF user_owns_report AND NOT is_admin_user THEN
        report_record := jsonb_set(
            report_record, 
            '{email}', 
            to_jsonb(COALESCE(
                report_record->>'masked_email',
                public.mask_email(report_record->>'email')
            ))
        );
    END IF;
    
    RETURN report_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_masked_payment_info(payment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    payment_record jsonb;
    user_owns_payment boolean;
    is_super_admin boolean;
BEGIN
    -- Validate input
    IF payment_id IS NULL THEN
        RAISE EXCEPTION 'Payment ID cannot be null';
    END IF;

    -- Check if user owns this payment
    SELECT EXISTS (
        SELECT 1 FROM public.payments p
        JOIN public.orders o ON p.order_id = o.id
        WHERE p.id = payment_id AND o.user_id = auth.uid()
    ) INTO user_owns_payment;
    
    -- Check if user is super admin
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE user_id = auth.uid() AND role = 'super-admin'
    ) INTO is_super_admin;
    
    -- Only allow access if user owns payment or is super admin
    IF NOT (user_owns_payment OR is_super_admin) THEN
        RAISE EXCEPTION 'Access denied to payment information';
    END IF;
    
    -- Get payment record
    SELECT to_jsonb(p.*) INTO payment_record
    FROM public.payments p
    WHERE p.id = payment_id;
    
    -- For regular users, mask sensitive fields
    IF user_owns_payment AND NOT is_super_admin THEN
        payment_record := jsonb_set(
            payment_record, 
            '{stripe_payment_intent_id}', 
            to_jsonb('pi_****' || right(payment_record->>'stripe_payment_intent_id', 4))
        );
        payment_record := jsonb_set(
            payment_record, 
            '{stripe_payment_method_id}', 
            to_jsonb('pm_****' || right(payment_record->>'stripe_payment_method_id', 4))
        );
        -- Remove sensitive metadata
        payment_record := payment_record - 'metadata';
    END IF;
    
    -- Log access to payment data
    PERFORM public.log_security_event(
        'PAYMENT_DATA_ACCESS',
        CASE WHEN is_super_admin THEN 'medium' ELSE 'low' END,
        jsonb_build_object(
            'payment_id', payment_id,
            'user_type', CASE WHEN is_super_admin THEN 'super_admin' ELSE 'customer' END,
            'masked', NOT is_super_admin
        ),
        auth.uid()
    );
    
    RETURN payment_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_completion_percentage(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  total_fields INTEGER := 8;
  completed_fields INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check each important field
  IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.bio IS NOT NULL AND profile_record.bio != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.avatar_url IS NOT NULL AND profile_record.avatar_url != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.phone IS NOT NULL AND profile_record.phone != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.location IS NOT NULL AND profile_record.location != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.city IS NOT NULL AND profile_record.city != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.postal_code IS NOT NULL AND profile_record.postal_code != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  IF profile_record.country IS NOT NULL AND profile_record.country != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  RETURN ROUND((completed_fields::DECIMAL / total_fields) * 100);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_security_setting(setting_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    setting_val jsonb;
BEGIN
    -- Validate input
    IF setting_key IS NULL OR setting_key = '' THEN
        RAISE EXCEPTION 'Setting key cannot be null or empty';
    END IF;

    SELECT setting_value INTO setting_val
    FROM public.security_config
    WHERE setting_name = setting_key;
    
    RETURN COALESCE(setting_val, 'null'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.init_loyalty_account(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert initial loyalty points record with ON CONFLICT handling
  INSERT INTO public.loyalty_points (
    user_id, points_balance, total_points_earned, total_points_spent, tier
  ) VALUES (
    user_uuid, 100, 100, 0, 'bronze'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add signup bonus transaction only if not exists
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, description
  ) VALUES (
    user_uuid, 100, 'bonus', 'signup_bonus', 'Bonus de bienvenue'
  )
  ON CONFLICT DO NOTHING;
END;
$$;