-- File_name : 20260430223942_remote_schema.sql

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."admin_order_permission" AS ENUM (
    'read_only',
    'operations',
    'full_access'
);


ALTER TYPE "public"."admin_order_permission" OWNER TO "postgres";


CREATE TYPE "public"."anomaly_severity" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."anomaly_severity" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'user',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."order_anomaly_type" AS ENUM (
    'payment',
    'stock',
    'delivery',
    'fraud',
    'technical',
    'customer',
    'carrier'
);


ALTER TYPE "public"."order_anomaly_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'created',
    'payment_pending',
    'payment_failed',
    'paid',
    'validation_in_progress',
    'validated',
    'preparing',
    'shipped',
    'in_transit',
    'delivered',
    'delivery_failed',
    'partially_delivered',
    'return_requested',
    'returned',
    'refunded',
    'partially_refunded',
    'cancelled',
    'archived'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."status_change_actor" AS ENUM (
    'system',
    'admin',
    'customer',
    'webhook',
    'scheduler'
);


ALTER TYPE "public"."status_change_actor" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_admin_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text" DEFAULT NULL::"text", "p_is_super_admin" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE 
    v_requesting_user_id UUID;
BEGIN
    -- Get the current user's ID
    v_requesting_user_id := auth.uid();

    -- Check if the requesting user is a super admin
    IF NOT EXISTS (
        SELECT 1 
        FROM public.admin_users 
        WHERE user_id = v_requesting_user_id AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can add new admin users';
    END IF;

    -- Insert the new admin user
    INSERT INTO public.admin_users (user_id, email, full_name, role)
    VALUES (p_user_id, p_email, p_full_name, CASE WHEN p_is_super_admin THEN 'super-admin' ELSE 'admin' END);
END;
$$;


ALTER FUNCTION "public"."add_admin_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_is_super_admin" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_loyalty_points"("p_user_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT ''::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_new_balance integer;
  v_new_total_earned integer;
  v_new_total_spent integer;
  v_transaction_type text;
BEGIN
  IF p_points >= 0 THEN
    v_transaction_type := 'earn';
  ELSE
    v_transaction_type := 'spend';
  END IF;

  UPDATE public.loyalty_points
  SET 
    points_balance = points_balance + p_points,
    total_points_earned = CASE WHEN p_points > 0 THEN total_points_earned + p_points ELSE total_points_earned END,
    total_points_spent = CASE WHEN p_points < 0 THEN total_points_spent + ABS(p_points) ELSE total_points_spent END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING points_balance, total_points_earned, total_points_spent
  INTO v_new_balance, v_new_total_earned, v_new_total_spent;

  INSERT INTO public.loyalty_transactions (user_id, points_change, transaction_type, source_type, source_id, description)
  VALUES (p_user_id, p_points, v_transaction_type, p_source_type, p_source_id, p_description);

  UPDATE public.loyalty_points
  SET 
    tier = CASE 
      WHEN v_new_total_earned >= 5000 THEN 'platinum'
      WHEN v_new_total_earned >= 2000 THEN 'gold'
      WHEN v_new_total_earned >= 500 THEN 'silver'
      ELSE 'bronze'
    END,
    tier_progress = v_new_total_earned,
    next_tier_threshold = CASE 
      WHEN v_new_total_earned >= 5000 THEN 10000
      WHEN v_new_total_earned >= 2000 THEN 5000
      WHEN v_new_total_earned >= 500 THEN 2000
      ELSE 500
    END
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."add_loyalty_points"("p_user_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_loyalty_points"("user_uuid" "uuid", "points" integer, "transaction_type" "text", "source_type" "text", "source_id" "text" DEFAULT NULL::"text", "description" "text" DEFAULT 'Points earned'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Authorization check: Only allow if caller is the user themselves, an admin, or system call
  IF auth.uid() IS NOT NULL 
     AND auth.uid() != user_uuid 
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify loyalty points for another user';
  END IF;

  -- Validate input parameters
  IF user_uuid IS NULL OR points IS NULL OR transaction_type IS NULL OR source_type IS NULL THEN
    RAISE EXCEPTION 'Invalid parameters: user_uuid, points, transaction_type, and source_type cannot be null';
  END IF;
  
  IF points < -10000 OR points > 10000 THEN
    RAISE EXCEPTION 'Points value out of acceptable range (-10000 to 10000)';
  END IF;

  -- Ensure user has loyalty account
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier)
  VALUES (user_uuid, 0, 0, 0, 'bronze')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert transaction record
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, source_id, description
  ) VALUES (
    user_uuid, points, transaction_type, source_type, source_id, description
  );

  -- Update user's loyalty points
  UPDATE public.loyalty_points
  SET 
    points_balance = points_balance + points,
    total_points_earned = CASE 
      WHEN transaction_type = 'earned' OR transaction_type = 'bonus' 
      THEN total_points_earned + points
      ELSE total_points_earned
    END,
    total_points_spent = CASE 
      WHEN transaction_type = 'spent' 
      THEN total_points_spent + ABS(points)
      ELSE total_points_spent
    END,
    updated_at = now()
  WHERE user_id = user_uuid;

  -- Update tier if points were earned
  IF transaction_type IN ('earned', 'bonus') THEN
    PERFORM public.update_loyalty_tier(user_uuid);
  END IF;
END;
$$;


ALTER FUNCTION "public"."add_loyalty_points"("user_uuid" "uuid", "points" integer, "transaction_type" "text", "source_type" "text", "source_id" "text", "description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."anonymize_sensitive_data"("input_data" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    result jsonb := input_data;
    sensitive_fields text[] := ARRAY['email', 'phone', 'address_line1', 'address_line2', 'first_name', 'last_name', 'ip_address'];
    field text;
BEGIN
    -- Validate input
    IF input_data IS NULL THEN
        RETURN '{}'::jsonb;
    END IF;

    -- Anonymize sensitive fields
    FOREACH field IN ARRAY sensitive_fields
    LOOP
        IF result ? field THEN
            result := jsonb_set(result, ARRAY[field], to_jsonb('***REDACTED***'), false);
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."anonymize_sensitive_data"("input_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_old_payment_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Archive payment records older than 7 years (regulatory requirement)
    -- This would typically move data to an archive table or secure storage
    -- For now, we'll just add a note - implement actual archiving based on requirements
    
    PERFORM public.log_security_event(
        'PAYMENT_DATA_RETENTION_CHECK',
        'low',
        jsonb_build_object(
            'check_date', now(),
            'note', 'Payment data retention check performed'
        )
    );
END;
$$;


ALTER FUNCTION "public"."archive_old_payment_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_checkout_session_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log admin access to checkout sessions with PII
  IF public.is_admin_user(auth.uid()) AND (NEW.personal_info IS NOT NULL OR NEW.shipping_info IS NOT NULL) THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values
    ) VALUES (
      auth.uid(),
      'CHECKOUT_SESSION_PII_ACCESS',
      'checkout_session',
      NEW.id::text,
      jsonb_build_object(
        'accessed_at', now(),
        'has_personal_info', NEW.personal_info IS NOT NULL,
        'has_shipping_info', NEW.shipping_info IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_checkout_session_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_role_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ROLE_GRANTED',
      'user_role',
      NEW.id::TEXT,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'granted_by', NEW.granted_by
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.revoked_at IS NOT NULL AND OLD.revoked_at IS NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ROLE_REVOKED',
      'user_role',
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."audit_role_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_log_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only log if order_status actually changed
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    INSERT INTO public.order_status_history (
      order_id, previous_status, new_status, changed_by, metadata
    )
    VALUES (
      NEW.id, OLD.order_status, NEW.order_status, 'system',
      jsonb_build_object('trigger', 'auto_log', 'updated_at', now())
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_log_order_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_fraud_score"("p_order_id" "uuid", "p_customer_email" "text", "p_shipping_address" "jsonb", "p_billing_address" "jsonb", "p_ip_address" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text", "p_checkout_duration_seconds" integer DEFAULT NULL::integer, "p_is_first_order" boolean DEFAULT false, "p_order_amount" numeric DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_score DECIMAL(5,2) := 0;
  v_triggered_rules JSONB := '[]'::jsonb;
  v_risk_level TEXT;
  v_auto_action TEXT;
  v_rule RECORD;
  v_rule_triggered BOOLEAN;
  v_rule_details JSONB;
  v_recent_orders_count INTEGER;
  v_threshold DECIMAL;
BEGIN
  -- Loop through active fraud rules
  FOR v_rule IN SELECT * FROM public.fraud_rules WHERE is_active = true ORDER BY score_impact DESC
  LOOP
    v_rule_triggered := false;
    v_rule_details := '{}'::jsonb;
    
    CASE v_rule.rule_name
      -- Address mismatch check
      WHEN 'shipping_billing_mismatch' THEN
        IF p_shipping_address IS NOT NULL AND p_billing_address IS NOT NULL THEN
          IF (p_shipping_address->>'city') IS DISTINCT FROM (p_billing_address->>'city') OR
             (p_shipping_address->>'postal_code') IS DISTINCT FROM (p_billing_address->>'postal_code') THEN
            v_rule_triggered := true;
            v_rule_details := jsonb_build_object(
              'shipping_city', p_shipping_address->>'city',
              'billing_city', p_billing_address->>'city'
            );
          END IF;
        END IF;
        
      -- First time customer
      WHEN 'first_time_customer' THEN
        IF p_is_first_order THEN
          v_rule_triggered := true;
        END IF;
        
      -- High value first order
      WHEN 'high_value_first_order' THEN
        v_threshold := COALESCE((v_rule.parameters->>'threshold')::decimal, 500);
        IF p_is_first_order AND p_order_amount >= v_threshold THEN
          v_rule_triggered := true;
          v_rule_details := jsonb_build_object('amount', p_order_amount, 'threshold', v_threshold);
        END IF;
        
      -- Rush checkout
      WHEN 'rush_checkout' THEN
        IF p_checkout_duration_seconds IS NOT NULL AND 
           p_checkout_duration_seconds < COALESCE((v_rule.parameters->>'min_seconds')::integer, 30) THEN
          v_rule_triggered := true;
          v_rule_details := jsonb_build_object('duration_seconds', p_checkout_duration_seconds);
        END IF;
        
      -- Multiple orders same email
      WHEN 'multiple_orders_same_email' THEN
        SELECT COUNT(*) INTO v_recent_orders_count
        FROM public.orders o
        JOIN public.profiles p ON o.user_id = p.id
        JOIN auth.users u ON p.id = u.id
        WHERE u.email = p_customer_email
          AND o.created_at > now() - (COALESCE((v_rule.parameters->>'hours')::integer, 24) || ' hours')::interval
          AND o.id != p_order_id;
        
        IF v_recent_orders_count >= COALESCE((v_rule.parameters->>'max_orders')::integer, 2) THEN
          v_rule_triggered := true;
          v_rule_details := jsonb_build_object('recent_orders', v_recent_orders_count);
        END IF;
        
      -- Suspicious user agent
      WHEN 'suspicious_user_agent' THEN
        IF p_user_agent IS NULL OR 
           p_user_agent = '' OR 
           p_user_agent ~* '(bot|crawler|spider|scraper|curl|wget|python|java|php)' THEN
          v_rule_triggered := true;
          v_rule_details := jsonb_build_object('user_agent', COALESCE(p_user_agent, 'missing'));
        END IF;
        
      ELSE
        -- Other rules can be added here
        NULL;
    END CASE;
    
    -- If rule triggered, add to score and log
    IF v_rule_triggered THEN
      v_total_score := v_total_score + v_rule.score_impact;
      v_triggered_rules := v_triggered_rules || jsonb_build_array(
        jsonb_build_object(
          'rule_name', v_rule.rule_name,
          'rule_type', v_rule.rule_type,
          'score', v_rule.score_impact,
          'description', v_rule.description,
          'details', v_rule_details
        )
      );
    END IF;
  END LOOP;
  
  -- Determine risk level
  v_risk_level := CASE
    WHEN v_total_score >= 70 THEN 'critical'
    WHEN v_total_score >= 50 THEN 'high'
    WHEN v_total_score >= 25 THEN 'medium'
    ELSE 'low'
  END;
  
  -- Determine automatic action
  v_auto_action := CASE
    WHEN v_total_score >= 70 THEN 'reject'
    WHEN v_total_score >= 50 THEN 'hold'
    WHEN v_total_score >= 25 THEN 'manual_review'
    ELSE 'approve'
  END;
  
  -- Update order with fraud score
  UPDATE public.orders
  SET fraud_score = v_total_score,
      fraud_flags = v_triggered_rules,
      updated_at = now()
  WHERE id = p_order_id;
  
  -- Create fraud assessment record
  INSERT INTO public.fraud_assessments (
    order_id, total_score, risk_level, triggered_rules, 
    assessment_data, auto_action
  ) VALUES (
    p_order_id, v_total_score, v_risk_level, v_triggered_rules,
    jsonb_build_object(
      'email', p_customer_email,
      'ip_address', p_ip_address,
      'is_first_order', p_is_first_order,
      'order_amount', p_order_amount,
      'checkout_duration', p_checkout_duration_seconds
    ),
    v_auto_action
  );
  
  -- If high risk, put order on hold (validation_in_progress)
  IF v_auto_action IN ('hold', 'reject') THEN
    -- Create anomaly record
    INSERT INTO public.order_anomalies (
      order_id, anomaly_type, severity, title, description,
      detected_by, metadata
    ) VALUES (
      p_order_id,
      'fraud',
      CASE WHEN v_auto_action = 'reject' THEN 'critical' ELSE 'high' END,
      'Fraud Detection Alert',
      format('Order flagged with fraud score %s (%s risk). %s rule(s) triggered.', 
             v_total_score, v_risk_level, jsonb_array_length(v_triggered_rules)),
      'system',
      jsonb_build_object(
        'fraud_score', v_total_score,
        'risk_level', v_risk_level,
        'triggered_rules', v_triggered_rules,
        'auto_action', v_auto_action
      )
    );
    
    -- Update order to validation_in_progress
    UPDATE public.orders
    SET order_status = 'validation_in_progress',
        requires_attention = true,
        attention_reason = format('Fraud score: %s (%s)', v_total_score, v_risk_level),
        has_anomaly = true,
        anomaly_count = COALESCE(anomaly_count, 0) + 1,
        updated_at = now()
    WHERE id = p_order_id;
    
    -- Log status change
    INSERT INTO public.order_status_history (
      order_id, previous_status, new_status, changed_by,
      reason_code, reason_message, metadata
    ) VALUES (
      p_order_id, 'paid', 'validation_in_progress', 'system',
      'FRAUD_HOLD', format('Automatic fraud hold - score: %s', v_total_score),
      jsonb_build_object('fraud_score', v_total_score, 'risk_level', v_risk_level)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'total_score', v_total_score,
    'risk_level', v_risk_level,
    'auto_action', v_auto_action,
    'triggered_rules_count', jsonb_array_length(v_triggered_rules),
    'triggered_rules', v_triggered_rules
  );
END;
$$;


ALTER FUNCTION "public"."calculate_fraud_score"("p_order_id" "uuid", "p_customer_email" "text", "p_shipping_address" "jsonb", "p_billing_address" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_checkout_duration_seconds" integer, "p_is_first_order" boolean, "p_order_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_support_ticket"("ticket_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    ticket_user_id uuid;
BEGIN
    -- Get the user_id of the ticket
    SELECT user_id INTO ticket_user_id
    FROM public.support_tickets
    WHERE id = ticket_id;
    
    -- Allow access if user owns the ticket or is an admin
    RETURN (
        ticket_user_id = auth.uid() OR 
        public.is_admin_user(auth.uid())
    );
END;
$$;


ALTER FUNCTION "public"."can_access_support_ticket"("ticket_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_attempts" integer DEFAULT 5, "p_window_minutes" integer DEFAULT 60) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    current_attempts integer := 0;
    window_start_time timestamp with time zone;
BEGIN
    -- Validate input parameters
    IF p_identifier IS NULL OR p_action_type IS NULL THEN
        RAISE EXCEPTION 'Identifier and action type cannot be null';
    END IF;
    
    IF p_max_attempts < 1 OR p_window_minutes < 1 THEN
        RAISE EXCEPTION 'Max attempts and window minutes must be positive';
    END IF;

    -- Clean up old entries (older than window)
    DELETE FROM public.rate_limits 
    WHERE window_start < now() - (p_window_minutes || ' minutes')::interval;

    -- Get current attempts for this identifier and action
    SELECT attempts, window_start INTO current_attempts, window_start_time
    FROM public.rate_limits
    WHERE identifier = p_identifier AND action_type = p_action_type;

    -- If no record exists, create one
    IF current_attempts IS NULL THEN
        INSERT INTO public.rate_limits (identifier, action_type, attempts, window_start)
        VALUES (p_identifier, p_action_type, 1, now())
        ON CONFLICT (identifier, action_type) 
        DO UPDATE SET 
            attempts = rate_limits.attempts + 1,
            created_at = now();
        RETURN true;
    END IF;

    -- Check if we're still within the window
    IF window_start_time > now() - (p_window_minutes || ' minutes')::interval THEN
        -- Within window, check if limit exceeded
        IF current_attempts >= p_max_attempts THEN
            RETURN false; -- Rate limit exceeded
        ELSE
            -- Increment attempts
            UPDATE public.rate_limits 
            SET attempts = attempts + 1, created_at = now()
            WHERE identifier = p_identifier AND action_type = p_action_type;
            RETURN true;
        END IF;
    ELSE
        -- Window expired, reset counter
        UPDATE public.rate_limits 
        SET attempts = 1, window_start = now(), created_at = now()
        WHERE identifier = p_identifier AND action_type = p_action_type;
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_window_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_stale_pending_orders"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cleaned_count integer;
  cancelled_ids uuid[];
BEGIN
  -- Cancel stale pending orders (status is text column, 'pending' is valid)
  WITH cancelled AS (
    UPDATE orders
    SET 
      status = 'cancelled',
      order_status = 'cancelled'::order_status,
      updated_at = now(),
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{cancelled_reason}',
        '"stale_pending_cleanup"'
      )
    WHERE status = 'pending'
      AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*), array_agg(id) INTO cleaned_count, cancelled_ids FROM cancelled;

  -- Log to history using correct enum values
  IF cleaned_count > 0 AND cancelled_ids IS NOT NULL THEN
    INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, reason_code, reason_message)
    SELECT unnest(cancelled_ids), 'payment_pending'::order_status, 'cancelled'::order_status, 'scheduler'::status_change_actor, 'STALE_CLEANUP', 'Auto-cancelled: pending > 24 hours';
  END IF;

  RAISE LOG 'cleanup_stale_pending_orders: cancelled % orders', cleaned_count;
  
  RETURN cleaned_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_stale_pending_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid", "p_payment_intent" "text", "p_amount" numeric, "p_currency" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  insufficient_count INTEGER;
BEGIN
  -- 1. Lock the order row
  PERFORM 1
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- 2. Mark order as paid (idempotent)
  UPDATE orders
  SET status = 'paid',
      order_status = 'paid',
      updated_at = now()
  WHERE id = p_order_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 3. Check stock
  SELECT COUNT(*)
  INTO insufficient_count
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = p_order_id
    AND p.stock_quantity < oi.quantity;

  IF insufficient_count > 0 THEN
    RAISE EXCEPTION 'Stock insuffisant pour un ou plusieurs produits';
  END IF;

  -- 4. Decrement stock
  UPDATE products p
  SET stock_quantity = p.stock_quantity - oi.quantity
  FROM order_items oi
  WHERE oi.order_id = p_order_id
    AND p.id = oi.product_id;

  -- 5. Record payment (idempotent via unique constraint)
  INSERT INTO payments (
    id, order_id, stripe_payment_intent_id, amount, currency, status, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_order_id, p_payment_intent, p_amount, p_currency, 'paid', now(), now()
  )
  ON CONFLICT (stripe_payment_intent_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid", "p_payment_intent" "text", "p_amount" numeric, "p_currency" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_guest_token"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _guest_id text;
  _signature text;
  _secret text;
BEGIN
  _guest_id := gen_random_uuid()::text;
  
  -- Use a server-side secret for HMAC signing
  _secret := COALESCE(
    current_setting('app.settings.guest_token_secret', true),
    'default-guest-secret-change-in-production'
  );
  
  _signature := encode(
    hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  
  RETURN jsonb_build_object(
    'guest_id', _guest_id,
    'signature', _signature,
    'expires_at', (now() + interval '24 hours')::text
  );
END;
$$;


ALTER FUNCTION "public"."create_guest_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_anomaly"("p_order_id" "uuid", "p_anomaly_type" "public"."order_anomaly_type", "p_severity" "public"."anomaly_severity", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_detected_by" "public"."status_change_actor" DEFAULT 'system'::"public"."status_change_actor", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_anomaly_id UUID;
BEGIN
  -- Insert anomaly
  INSERT INTO public.order_anomalies (
    order_id, anomaly_type, severity, title, description, detected_by, metadata
  )
  VALUES (
    p_order_id, p_anomaly_type, p_severity, p_title, p_description, p_detected_by, p_metadata
  )
  RETURNING id INTO v_anomaly_id;
  
  -- Update order flags
  UPDATE public.orders
  SET 
    has_anomaly = true,
    anomaly_count = anomaly_count + 1,
    requires_attention = CASE 
      WHEN p_severity IN ('high', 'critical') THEN true 
      ELSE requires_attention 
    END,
    attention_reason = CASE 
      WHEN p_severity IN ('high', 'critical') THEN p_title 
      ELSE attention_reason 
    END,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Log security event for critical anomalies
  IF p_severity = 'critical' THEN
    PERFORM public.log_security_event(
      'CRITICAL_ORDER_ANOMALY',
      'critical',
      jsonb_build_object(
        'order_id', p_order_id,
        'anomaly_id', v_anomaly_id,
        'anomaly_type', p_anomaly_type::text,
        'title', p_title
      )
    );
  END IF;
  
  RETURN v_anomaly_id;
END;
$$;


ALTER FUNCTION "public"."create_order_anomaly"("p_order_id" "uuid", "p_anomaly_type" "public"."order_anomaly_type", "p_severity" "public"."anomaly_severity", "p_title" "text", "p_description" "text", "p_detected_by" "public"."status_change_actor", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_and_alert_security_event"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  alert_id UUID;
  should_alert BOOLEAN := false;
  alert_severity TEXT := 'medium';
  alert_title TEXT;
  alert_description TEXT;
BEGIN
  -- Detect critical security events that need immediate alerting
  
  -- 1. Unauthorized admin access attempts
  IF NEW.event_type IN ('UNAUTHORIZED_ADMIN_LIST_ACCESS', 'UNAUTHORIZED_ADMIN_ACCESS') THEN
    should_alert := true;
    alert_severity := 'critical';
    alert_title := 'Tentative d''accès admin non autorisée';
    alert_description := 'Un utilisateur a tenté d''accéder aux fonctionnalités admin sans autorisation.';
  END IF;
  
  -- 2. Excessive data access patterns (scraping attempts)
  IF NEW.event_type IN ('NEWSLETTER_SCRAPING_ATTEMPT', 'CONTACT_DATA_SCRAPING_ATTEMPT', 'EXCESSIVE_CONTACT_ACCESS', 'EXCESSIVE_CONTACT_BULK_ACCESS') THEN
    should_alert := true;
    alert_severity := 'high';
    alert_title := 'Tentative de scraping de données détectée';
    alert_description := 'Un pattern d''accès excessif aux données a été détecté, possible tentative de scraping.';
  END IF;
  
  -- 3. Suspicious login patterns
  IF NEW.event_type IN ('SUSPICIOUS_LOGIN_PATTERN', 'MULTIPLE_IP_LOGIN') THEN
    should_alert := true;
    alert_severity := 'high';
    alert_title := 'Activité de connexion suspecte';
    alert_description := 'Des patterns de connexion anormaux ont été détectés (multiples IPs ou échecs répétés).';
  END IF;
  
  -- 4. Payment fraud attempts
  IF NEW.event_type IN ('SUSPICIOUS_PAYMENT_ACCESS', 'PAYMENT_DATA_SCRAPING') THEN
    should_alert := true;
    alert_severity := 'critical';
    alert_title := 'Tentative de fraude au paiement détectée';
    alert_description := 'Accès suspect aux données de paiement détecté.';
  END IF;
  
  -- 5. Audit log tampering attempts
  IF NEW.event_type = 'AUDIT_LOG_FLOODING_DETECTED' THEN
    should_alert := true;
    alert_severity := 'critical';
    alert_title := 'Tentative de manipulation des logs d''audit';
    alert_description := 'Une tentative de flood des logs d''audit a été détectée, possible tentative de masquer des activités malveillantes.';
  END IF;
  
  -- 6. Admin role changes (always alert)
  IF NEW.event_type = 'ADMIN_ROLE_CHANGED' THEN
    should_alert := true;
    alert_severity := 'high';
    alert_title := 'Changement de rôle admin détecté';
    alert_description := 'Un rôle administrateur a été modifié. Vérifiez que cette action est légitime.';
  END IF;
  
  -- 7. Suspicious profile access
  IF NEW.event_type = 'SUSPICIOUS_PROFILE_ACCESS' THEN
    should_alert := true;
    alert_severity := 'medium';
    alert_title := 'Accès profil suspect';
    alert_description := 'Un utilisateur accède à un nombre anormal de profils.';
  END IF;
  
  -- Create alert if needed
  IF should_alert THEN
    INSERT INTO public.security_alerts (
      alert_type,
      severity,
      title,
      description,
      source_ip,
      user_id,
      metadata
    ) VALUES (
      NEW.event_type,
      alert_severity,
      alert_title,
      alert_description,
      NEW.ip_address,
      NEW.user_id,
      jsonb_build_object(
        'security_event_id', NEW.id,
        'event_data', NEW.event_data,
        'user_agent', NEW.user_agent,
        'detected_at', NEW.detected_at
      )
    ) RETURNING id INTO alert_id;
    
    -- Log alert creation
    RAISE NOTICE 'Security alert created: % (severity: %)', alert_title, alert_severity;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."detect_and_alert_security_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_newsletter_scraping"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Detect potential email scraping attempts
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    -- Check how many different newsletter records this user accessed recently
    SELECT COUNT(DISTINCT resource_id) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action = 'NEWSLETTER_ACCESS'
      AND created_at > now() - interval '1 hour';
    
    -- If accessing more than 10 different newsletter records in an hour, flag as suspicious
    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'NEWSLETTER_SCRAPING_ATTEMPT',
        'high',
        jsonb_build_object(
          'user_id', auth.uid(),
          'access_count', access_count,
          'time_window', '1 hour',
          'detection_reason', 'Excessive newsletter subscription access'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."detect_newsletter_scraping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_newsletter_scraping_enhanced"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  access_count INTEGER;
BEGIN
  -- Enhanced detection for potential newsletter manipulation
  IF TG_OP IN ('INSERT', 'UPDATE') AND auth.uid() IS NOT NULL THEN
    -- Check how many newsletter operations this user performed recently
    SELECT COUNT(*) INTO access_count
    FROM public.audit_logs
    WHERE user_id = auth.uid()
      AND action LIKE '%NEWSLETTER%'
      AND created_at > now() - interval '1 hour';
    
    -- Flag as suspicious if too many operations
    IF access_count > 10 THEN
      PERFORM public.log_security_event(
        'SUSPICIOUS_NEWSLETTER_ACTIVITY',
        'medium',
        jsonb_build_object(
          'user_id', auth.uid(),
          'operation_count', access_count,
          'time_window', '1 hour',
          'operation_type', TG_OP,
          'detection_reason', 'Excessive newsletter operations'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."detect_newsletter_scraping_enhanced"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_payment_fraud"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    access_count integer;
    different_payments integer;
BEGIN
    -- Check for excessive payment data access in short time
    IF NEW.action LIKE '%SELECT%' AND NEW.resource_type = 'payments' THEN
        SELECT COUNT(*) INTO access_count
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = 'payments'
          AND action LIKE '%SELECT%'
          AND created_at > now() - interval '5 minutes';
        
        IF access_count > 20 THEN
            PERFORM public.log_security_event(
                'SUSPICIOUS_PAYMENT_ACCESS',
                'high',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'access_count', access_count,
                    'time_window', '5 minutes',
                    'detection_reason', 'Excessive payment data access'
                ),
                NEW.user_id
            );
        END IF;
        
        -- Check for access to many different payment records
        SELECT COUNT(DISTINCT resource_id) INTO different_payments
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = 'payments'
          AND action LIKE '%SELECT%'
          AND created_at > now() - interval '10 minutes';
        
        IF different_payments > 10 THEN
            PERFORM public.log_security_event(
                'PAYMENT_DATA_SCRAPING',
                'critical',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'payment_count', different_payments,
                    'time_window', '10 minutes',
                    'detection_reason', 'Potential payment data scraping attempt'
                ),
                NEW.user_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."detect_payment_fraud"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_security_breach"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    recent_failures integer;
    unusual_access integer;
BEGIN
    -- Check for potential data breach indicators
    IF NEW.action LIKE '%SELECT%' AND NEW.resource_type IN ('payments', 'shipping_addresses', 'admin_users') THEN
        -- Check for unusual access patterns
        SELECT COUNT(*) INTO unusual_access
        FROM public.audit_logs
        WHERE user_id = NEW.user_id
          AND resource_type = NEW.resource_type
          AND created_at > now() - interval '5 minutes'
          AND action LIKE '%SELECT%';
        
        IF unusual_access > 10 THEN
            PERFORM public.log_security_event(
                'SUSPICIOUS_DATA_ACCESS',
                'high',
                jsonb_build_object(
                    'user_id', NEW.user_id,
                    'resource_type', NEW.resource_type,
                    'access_count', unusual_access,
                    'time_window', '5 minutes'
                ),
                NEW.user_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."detect_security_breach"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_suspicious_login"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  recent_failures integer;
  different_ips integer;
BEGIN
  -- Check for multiple failed logins from same IP in last hour
  SELECT COUNT(*) INTO recent_failures
  FROM public.audit_logs
  WHERE action = 'FAILED_LOGIN'
    AND ip_address = inet_client_addr()
    AND created_at > now() - interval '1 hour';
  
  IF recent_failures >= 5 THEN
    PERFORM public.log_security_event(
      'SUSPICIOUS_LOGIN_PATTERN',
      'high',
      jsonb_build_object(
        'recent_failures', recent_failures,
        'ip_address', inet_client_addr(),
        'detection_reason', 'Multiple failed logins from same IP'
      )
    );
  END IF;
  
  -- Check for logins from multiple IPs for same user in short time
  IF TG_OP = 'INSERT' AND NEW.action = 'LOGIN' THEN
    SELECT COUNT(DISTINCT ip_address) INTO different_ips
    FROM public.audit_logs
    WHERE user_id = NEW.user_id
      AND action = 'LOGIN'
      AND created_at > now() - interval '10 minutes';
    
    IF different_ips >= 3 THEN
      PERFORM public.log_security_event(
        'MULTIPLE_IP_LOGIN',
        'medium',
        jsonb_build_object(
          'user_id', NEW.user_id,
          'ip_count', different_ips,
          'detection_reason', 'Logins from multiple IPs in short timeframe'
        ),
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."detect_suspicious_login"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) RETURNS TABLE("allowed" boolean, "remaining" integer, "reset_ms" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_now          timestamptz := now();
  v_window       interval;
  v_count        integer;
  v_window_end   timestamptz;
BEGIN
  IF p_max_attempts <= 0 OR p_window_ms <= 0 THEN
    RAISE EXCEPTION 'edge_rate_limit_consume: p_max_attempts and p_window_ms must be positive';
  END IF;

  v_window := make_interval(secs => p_window_ms / 1000.0);

  INSERT INTO public.edge_rate_limits AS r (identifier, count, window_end, updated_at)
  VALUES (p_identifier, 1, v_now + v_window, v_now)
  ON CONFLICT (identifier) DO UPDATE
    SET
      count = CASE
        WHEN r.window_end <= v_now THEN 1            -- window expired — reset
        ELSE r.count + 1
      END,
      window_end = CASE
        WHEN r.window_end <= v_now THEN v_now + v_window
        ELSE r.window_end
      END,
      updated_at = v_now
  RETURNING r.count, r.window_end
  INTO v_count, v_window_end;

  RETURN QUERY SELECT
    (v_count <= p_max_attempts)::boolean,
    GREATEST(0, p_max_attempts - v_count)::integer,
    (extract(epoch from v_window_end) * 1000)::bigint;
END;
$$;


ALTER FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) IS 'Atomic rate-limit consume. See migration header and supabase/functions/get-order-by-token/lib/rate-limit-postgres.ts.';



CREATE OR REPLACE FUNCTION "public"."emergency_lockdown_contact_data"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only super admins can trigger emergency lockdown
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super-admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Drop all contact message access policies temporarily
  DROP POLICY IF EXISTS "secure_admin_contact_access" ON public.contact_messages;
  DROP POLICY IF EXISTS "admin_contact_update" ON public.contact_messages;
  DROP POLICY IF EXISTS "admin_contact_delete" ON public.contact_messages;
  
  -- Create lockdown policy (no access except super admin for read-only)
  CREATE POLICY "emergency_lockdown_readonly" ON public.contact_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND role = 'super-admin'
    )
  );

  -- Log the emergency lockdown
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'EMERGENCY_CONTACT_DATA_LOCKDOWN',
    'contact_messages',
    'system_lockdown',
    jsonb_build_object(
      'triggered_by', auth.uid(),
      'lockdown_time', now(),
      'reason', 'Emergency security measure activated',
      'requires_manual_unlock', true,
      'lockdown_type', 'super_admin_only_readonly'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  PERFORM public.log_security_event(
    'EMERGENCY_CONTACT_DATA_LOCKDOWN',
    'critical',
    jsonb_build_object(
      'triggered_by', auth.uid(),
      'lockdown_time', now(),
      'reason', 'Emergency security measure activated',
      'requires_manual_unlock', true
    ),
    auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."emergency_lockdown_contact_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enhanced_audit_logger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Log all operations on sensitive tables
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id, 
            new_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(NEW.id::text, 'unknown'),
            to_jsonb(NEW), 
            inet_client_addr(), 
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id,
            old_values, new_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(NEW.id::text, OLD.id::text, 'unknown'),
            to_jsonb(OLD), 
            to_jsonb(NEW), 
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id, action, resource_type, resource_id, 
            old_values, ip_address, user_agent
        ) VALUES (
            auth.uid(), 
            TG_OP || '_' || TG_TABLE_NAME, 
            TG_TABLE_NAME, 
            COALESCE(OLD.id::text, 'unknown'),
            to_jsonb(OLD), 
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."enhanced_audit_logger"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enhanced_audit_logger"() IS 'Audit logging function with proper security definer and search path settings';



CREATE OR REPLACE FUNCTION "public"."enhanced_log_contact_message_access"("message_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  contact_email text;
  access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Get the email from the contact message
  SELECT email INTO contact_email 
  FROM public.contact_messages 
  WHERE id = message_id;
  
  -- Log the access with masking
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object(
      'email_accessed', public.mask_email(contact_email),
      'access_time', now()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Monitor for excessive contact data access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGE_ACCESS'
    AND created_at > now() - interval '1 hour';

  IF access_count > 50 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_CONTACT_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential contact data scraping'
      ),
      auth.uid()
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."enhanced_log_contact_message_access"("message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_access_metrics"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result jsonb;
  total_admins integer;
  access_events_24h integer;
  unauthorized_attempts_24h integer;
  unique_accessors_7d integer;
BEGIN
  -- Only super_admins can view these metrics
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Get metrics
  SELECT COUNT(*) INTO total_admins FROM public.admin_users;
  
  SELECT COUNT(*) INTO access_events_24h
  FROM public.audit_logs
  WHERE action LIKE '%ADMIN_USER%'
    AND created_at > now() - interval '24 hours';
    
  SELECT COUNT(*) INTO unauthorized_attempts_24h
  FROM public.security_events
  WHERE event_type = 'UNAUTHORIZED_ADMIN_LIST_ACCESS'
    AND created_at > now() - interval '24 hours';
    
  SELECT COUNT(DISTINCT user_id) INTO unique_accessors_7d
  FROM public.audit_logs
  WHERE action LIKE '%ADMIN_USER%'
    AND created_at > now() - interval '7 days';

  result := jsonb_build_object(
    'total_admins', total_admins,
    'access_events_24h', access_events_24h,
    'unauthorized_attempts_24h', unauthorized_attempts_24h,
    'unique_accessors_7d', unique_accessors_7d,
    'risk_level', CASE 
      WHEN unauthorized_attempts_24h > 5 THEN 'CRITICAL'
      WHEN unauthorized_attempts_24h > 0 THEN 'HIGH'
      WHEN access_events_24h > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    'generated_at', now()
  );

  -- Log metrics access
  PERFORM public.log_security_event(
    'ADMIN_SECURITY_METRICS_ACCESSED',
    'low',
    jsonb_build_object('metrics', result),
    auth.uid()
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_admin_access_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users_secure"() RETURNS TABLE("id" "uuid", "email" "text", "name" "text", "role" "text", "last_login" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  access_count integer;
BEGIN
  -- Only super_admins can access this data
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    -- Log unauthorized access attempt
    PERFORM public.log_security_event(
      'UNAUTHORIZED_ADMIN_LIST_ACCESS',
      'critical',
      jsonb_build_object(
        'user_id', auth.uid(),
        'attempted_action', 'get_admin_users_secure',
        'access_time', now(),
        'detection_reason', 'Non-super-admin attempted to access admin user list'
      ),
      auth.uid()
    );
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Check for suspicious access patterns
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'ADMIN_USERS_LIST_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Alert on excessive access
  IF access_count > 10 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_ADMIN_LIST_ACCESS',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Suspicious admin user list access pattern'
      ),
      auth.uid()
    );
  END IF;

  -- Log successful access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'ADMIN_USERS_LIST_ACCESS',
    'admin_users',
    'list_query',
    jsonb_build_object(
      'access_time', now(),
      'previous_access_count_1hour', access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return admin users data
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.name,
    au.role,
    au.last_login,
    au.created_at
  FROM public.admin_users au
  ORDER BY au.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_admin_users_secure"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users_with_audit"() RETURNS TABLE("id" "uuid", "user_id" "uuid", "name" "text", "role" "text", "email" "text", "last_login" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_id UUID;
  is_super_admin BOOLEAN;
BEGIN
  caller_id := auth.uid();
  
  -- Check if caller is super_admin
  SELECT has_role(caller_id, 'super_admin') INTO is_super_admin;
  
  -- Log this access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    new_values,
    ip_address
  ) VALUES (
    caller_id,
    'SELECT_ALL',
    'admin_users',
    jsonb_build_object(
      'is_super_admin', is_super_admin,
      'function', 'get_admin_users_with_audit'
    ),
    inet_client_addr()
  );
  
  -- Super admins see all, regular users only see their own record
  IF is_super_admin THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.name,
      au.role,
      au.email,
      au.last_login,
      au.created_at
    FROM public.admin_users au
    ORDER BY au.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT 
      au.id,
      au.user_id,
      au.name,
      au.role,
      -- Mask email for non-super-admins viewing their own record
      LEFT(au.email, 2) || '***@' || SPLIT_PART(au.email, '@', 2) AS email,
      au.last_login,
      au.created_at
    FROM public.admin_users au
    WHERE au.user_id = caller_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_admin_users_with_audit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_auth_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contact_message_details"("message_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  contact_record jsonb;
  admin_role text;
  access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get admin role for enhanced logging
  SELECT role INTO admin_role
  FROM public.admin_users
  WHERE user_id = auth.uid();

  -- Check for excessive individual contact access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'FULL_CONTACT_MESSAGE_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Alert if accessing too many individual contacts
  IF access_count > 30 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_INDIVIDUAL_CONTACT_ACCESS',
      'high',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'admin_role', admin_role,
        'individual_access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential detailed contact data harvesting'
      ),
      auth.uid()
    );
  END IF;

  -- Get full contact record
  SELECT to_jsonb(cm.*) INTO contact_record
  FROM public.contact_messages cm
  WHERE cm.id = message_id;

  IF contact_record IS NULL THEN
    RAISE EXCEPTION 'Contact message not found';
  END IF;

  -- Enhanced logging for full contact access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'FULL_CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object(
      'admin_role', admin_role,
      'contact_message_id', message_id,
      'access_time', now(),
      'masked_email', public.mask_email(contact_record->>'email'),
      'subject', contact_record->>'subject',
      'requires_justification', true,
      'previous_access_count_1hour', access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN contact_record;
END;
$$;


ALTER FUNCTION "public"."get_contact_message_details"("message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_contact_messages_secure"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_include_pii" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "phone" "text", "company" "text", "subject" "text", "message" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  caller_id UUID;
  is_super_admin BOOLEAN;
  access_count INTEGER;
BEGIN
  caller_id := auth.uid();
  
  -- Check if caller is super_admin
  SELECT has_role(caller_id, 'super_admin') INTO is_super_admin;
  
  IF NOT is_super_admin THEN
    RAISE EXCEPTION 'Access denied: Super admin role required';
  END IF;
  
  -- Enforce maximum limit to prevent bulk exports
  IF p_limit > 100 THEN
    p_limit := 100;
  END IF;
  
  -- Log this access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    new_values,
    ip_address
  ) VALUES (
    caller_id,
    'BULK_SELECT',
    'contact_messages',
    jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'include_pii', p_include_pii,
      'function', 'get_contact_messages_secure'
    ),
    inet_client_addr()
  );
  
  -- Count recent bulk accesses
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = caller_id
    AND resource_type = 'contact_messages'
    AND action = 'BULK_SELECT'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Alert on excessive bulk access (more than 5 bulk queries per hour)
  IF access_count > 5 THEN
    INSERT INTO public.security_alerts (
      alert_type,
      severity,
      title,
      description,
      user_id,
      source_ip,
      metadata
    ) VALUES (
      'excessive_bulk_access',
      'critical',
      'Excessive Bulk Data Access',
      'Super admin has made more than 5 bulk contact message queries in the last hour.',
      caller_id,
      inet_client_addr(),
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '1 hour',
        'include_pii', p_include_pii
      )
    );
  END IF;
  
  -- Return data with optional masking
  IF p_include_pii THEN
    RETURN QUERY
    SELECT 
      cm.id,
      cm.first_name,
      cm.last_name,
      cm.email,
      cm.phone,
      cm.company,
      cm.subject,
      cm.message,
      cm.status,
      cm.created_at,
      cm.updated_at
    FROM public.contact_messages cm
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Return masked data
    RETURN QUERY
    SELECT 
      cm.id,
      LEFT(cm.first_name, 1) || '***'::TEXT AS first_name,
      LEFT(cm.last_name, 1) || '***'::TEXT AS last_name,
      LEFT(cm.email, 2) || '***@' || SPLIT_PART(cm.email, '@', 2) AS email,
      CASE 
        WHEN cm.phone IS NOT NULL THEN '***-' || RIGHT(REGEXP_REPLACE(cm.phone, '[^0-9]', '', 'g'), 4)
        ELSE NULL 
      END AS phone,
      cm.company,
      cm.subject,
      cm.message,
      cm.status,
      cm.created_at,
      cm.updated_at
    FROM public.contact_messages cm
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_contact_messages_secure"("p_limit" integer, "p_offset" integer, "p_include_pii" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_segments"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  result jsonb;
  total_customers integer := 0;
  new_customers integer := 0;
  repeat_customers integer := 0;
  at_risk_customers integer := 0;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Get total customers from profiles
  SELECT COUNT(*) INTO total_customers FROM public.profiles;
  
  -- Get new customers (registered in last 30 days)
  SELECT COUNT(*) INTO new_customers 
  FROM public.profiles 
  WHERE created_at >= now() - interval '30 days';
  
  -- Get repeat customers (have more than 1 order)
  SELECT COUNT(*) INTO repeat_customers
  FROM (
    SELECT user_id
    FROM public.orders
    WHERE status IN ('paid', 'processing', 'shipped', 'delivered')
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS repeats;
  
  -- Get at-risk customers (no orders in last 90 days but had orders before)
  SELECT COUNT(*) INTO at_risk_customers
  FROM (
    SELECT user_id
    FROM public.orders
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


ALTER FUNCTION "public"."get_customer_segments"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_masked_contact_messages"("limit_count" integer DEFAULT 50, "offset_count" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "masked_email" "text", "masked_phone" "text", "first_name_masked" "text", "last_name_masked" "text", "subject" "text", "message_preview" "text", "status" "text", "created_at" timestamp with time zone, "company" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  access_count integer;
  bulk_access_count integer;
BEGIN
  -- Verify admin access
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Monitor for excessive access patterns
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGES_BULK_QUERY'
    AND created_at > now() - interval '10 minutes';

  SELECT COUNT(*) INTO bulk_access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'CONTACT_MESSAGES_BULK_QUERY'
    AND created_at > now() - interval '1 hour';

  -- Alert for suspicious access patterns
  IF access_count > 10 THEN
    PERFORM public.log_security_event(
      'EXCESSIVE_CONTACT_BULK_ACCESS',
      'critical',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '10 minutes',
        'detection_reason', 'Potential contact data breach attempt'
      ),
      auth.uid()
    );
  ELSIF bulk_access_count > 20 THEN
    PERFORM public.log_security_event(
      'CONTACT_DATA_SCRAPING_ATTEMPT',
      'critical',
      jsonb_build_object(
        'admin_user_id', auth.uid(),
        'access_count', bulk_access_count,
        'time_window', '1 hour',
        'detection_reason', 'Potential contact database scraping'
      ),
      auth.uid()
    );
  END IF;

  -- Log bulk access attempt
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGES_BULK_QUERY',
    'contact_messages',
    'bulk_query',
    jsonb_build_object(
      'requested_limit', limit_count,
      'requested_offset', offset_count,
      'access_time', now(),
      'total_previous_access_10min', access_count,
      'total_previous_access_1hour', bulk_access_count
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return masked contact data
  RETURN QUERY
  SELECT 
    cm.id,
    public.mask_email(cm.email) as masked_email,
    CASE 
      WHEN cm.phone IS NOT NULL 
      THEN SUBSTRING(cm.phone FROM 1 FOR 3) || '****' || RIGHT(cm.phone, 2)
      ELSE NULL 
    END as masked_phone,
    LEFT(cm.first_name, 1) || REPEAT('*', LENGTH(cm.first_name) - 1) as first_name_masked,
    LEFT(cm.last_name, 1) || REPEAT('*', LENGTH(cm.last_name) - 1) as last_name_masked,
    cm.subject,
    LEFT(cm.message, 100) || CASE WHEN LENGTH(cm.message) > 100 THEN '...' ELSE '' END as message_preview,
    cm.status,
    cm.created_at,
    cm.company
  FROM public.contact_messages cm
  ORDER BY cm.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."get_masked_contact_messages"("limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_masked_error_report"("report_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_masked_error_report"("report_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_masked_payment_info"("payment_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_masked_payment_info"("payment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_newsletter_subscriptions_admin"() RETURNS TABLE("id" "uuid", "email" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "consent_given" boolean, "source" "text", "tags" "text"[], "metadata" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log admin access to newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'ADMIN_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'bulk_access',
    jsonb_build_object(
      'access_time', now(),
      'access_type', 'admin_function'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return newsletter subscriptions data
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags,
    ns.metadata
  FROM public.newsletter_subscriptions ns;
END;
$$;


ALTER FUNCTION "public"."get_newsletter_subscriptions_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_customer_view"("p_order_id" "uuid", "p_user_id" "uuid", "p_locale" "text" DEFAULT 'fr'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order RECORD;
  v_status_mapping RECORD;
  v_items JSONB;
  v_timeline JSONB;
BEGIN
  -- Get order (only if owned by user)
  SELECT o.*, 
         EXTRACT(EPOCH FROM (o.estimated_delivery - now()))/3600 as hours_to_delivery
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id AND o.user_id = p_user_id;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('error', 'ORDER_NOT_FOUND');
  END IF;
  
  -- Get customer-friendly status
  SELECT * INTO v_status_mapping
  FROM public.order_status_customer_mapping
  WHERE internal_status = v_order.order_status;
  
  -- Get order items
  SELECT jsonb_agg(jsonb_build_object(
    'id', oi.id,
    'product_name', oi.product_snapshot->>'name',
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'total_price', oi.total_price,
    'image_url', oi.product_snapshot->>'image_url'
  ))
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;
  
  -- Get simplified timeline (only customer-visible statuses)
  SELECT jsonb_agg(jsonb_build_object(
    'status', csm.customer_status_key,
    'label', CASE WHEN p_locale = 'en' THEN csm.customer_status_label_en ELSE csm.customer_status_label_fr END,
    'timestamp', osh.created_at,
    'is_current', (osh.new_status = v_order.order_status)
  ) ORDER BY osh.created_at)
  INTO v_timeline
  FROM public.order_status_history osh
  JOIN public.order_status_customer_mapping csm ON csm.internal_status = osh.new_status
  WHERE osh.order_id = p_order_id AND csm.show_to_customer = true;
  
  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', UPPER(SUBSTRING(v_order.id::text, 1, 8)),
    'status', jsonb_build_object(
      'key', v_status_mapping.customer_status_key,
      'label', CASE WHEN p_locale = 'en' THEN v_status_mapping.customer_status_label_en ELSE v_status_mapping.customer_status_label_fr END,
      'description', CASE WHEN p_locale = 'en' THEN v_status_mapping.customer_description_en ELSE v_status_mapping.customer_description_fr END,
      'icon', v_status_mapping.icon_name,
      'color', v_status_mapping.color_class
    ),
    'total_amount', v_order.amount,
    'currency', v_order.currency,
    'items', COALESCE(v_items, '[]'::jsonb),
    'timeline', COALESCE(v_timeline, '[]'::jsonb),
    'tracking', CASE 
      WHEN v_order.tracking_number IS NOT NULL THEN jsonb_build_object(
        'carrier', v_order.carrier,
        'tracking_number', v_order.tracking_number,
        'tracking_url', v_order.tracking_url
      )
      ELSE NULL
    END,
    'estimated_delivery', v_order.estimated_delivery,
    'created_at', v_order.created_at
  );
END;
$$;


ALTER FUNCTION "public"."get_order_customer_view"("p_order_id" "uuid", "p_user_id" "uuid", "p_locale" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_security_alerts"() RETURNS TABLE("id" "uuid", "alert_type" "text", "severity" "text", "title" "text", "description" "text", "source_ip" "inet", "user_id" "uuid", "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.alert_type,
    sa.severity,
    sa.title,
    sa.description,
    sa.source_ip,
    sa.user_id,
    sa.metadata,
    sa.created_at
  FROM public.security_alerts sa
  WHERE sa.notified_at IS NULL
    AND sa.severity IN ('high', 'critical')
  ORDER BY 
    CASE sa.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      ELSE 3 
    END,
    sa.created_at ASC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."get_pending_security_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_profile_completion_percentage"("user_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_profile_completion_percentage"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_request_guest_id"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _guest_id text;
  _signature text;
BEGIN
  _guest_id := current_setting('request.headers', true)::json->>'x-guest-id';
  _signature := current_setting('request.headers', true)::json->>'x-guest-signature';
  
  IF _guest_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If signature is provided, validate it
  IF _signature IS NOT NULL THEN
    IF NOT validate_guest_token(_guest_id, _signature) THEN
      RETURN NULL; -- Invalid signature, reject
    END IF;
  END IF;
  
  RETURN _guest_id;
END;
$$;


ALTER FUNCTION "public"."get_request_guest_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_security_setting"("setting_key" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_security_setting"("setting_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_emails_for_admin"("p_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "email" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE au.id = ANY(p_user_ids)
    AND public.is_admin_user(auth.uid())
$$;


ALTER FUNCTION "public"."get_user_emails_for_admin"("p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_newsletter_subscription"() RETURNS TABLE("id" "uuid", "email" "text", "status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "consent_given" boolean, "source" "text", "tags" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found or not authenticated';
  END IF;

  -- Log user access to their own newsletter data
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'USER_NEWSLETTER_ACCESS',
    'newsletter_subscriptions',
    'own_subscription',
    jsonb_build_object(
      'access_time', now(),
      'email_accessed', public.mask_email(user_email)
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Return user's own newsletter subscription
  RETURN QUERY
  SELECT 
    ns.id,
    ns.email,
    ns.status,
    ns.created_at,
    ns.updated_at,
    ns.consent_given,
    ns.source,
    ns.tags
  FROM public.newsletter_subscriptions ns
  WHERE ns.email = user_email;
END;
$$;


ALTER FUNCTION "public"."get_user_newsletter_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (
      SELECT role::text
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND revoked_at IS NULL
      ORDER BY CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        ELSE 3
      END
      LIMIT 1
    ),
    CASE WHEN auth.uid() IS NOT NULL THEN 'user' ELSE 'anonymous' END
  )
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        full_name,
        phone
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
      AND revoked_at IS NULL
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") IS 'Security definer function to check user roles - prevents RLS recursion issues';



CREATE OR REPLACE FUNCTION "public"."hash_ip_address"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Hash the IP address to anonymize it while still allowing fraud detection
  -- Keep only the /24 subnet for basic geo-analytics, hash the rest
  IF NEW.ip_address IS NOT NULL THEN
    -- Store hashed version for fraud detection, not actual IP
    NEW.user_agent := COALESCE(LEFT(NEW.user_agent, 200), 'unknown');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."hash_ip_address"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_ab_counter"("test_id" "uuid", "variant" "text", "counter_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF variant = 'a' THEN
    IF counter_type = 'view' THEN
      UPDATE ab_theme_tests SET variant_a_views = variant_a_views + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'add_to_cart' THEN
      UPDATE ab_theme_tests SET variant_a_add_to_cart = variant_a_add_to_cart + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'checkout' THEN
      UPDATE ab_theme_tests SET variant_a_checkout = variant_a_checkout + 1, updated_at = now() WHERE id = test_id;
    END IF;
  ELSIF variant = 'b' THEN
    IF counter_type = 'view' THEN
      UPDATE ab_theme_tests SET variant_b_views = variant_b_views + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'add_to_cart' THEN
      UPDATE ab_theme_tests SET variant_b_add_to_cart = variant_b_add_to_cart + 1, updated_at = now() WHERE id = test_id;
    ELSIF counter_type = 'checkout' THEN
      UPDATE ab_theme_tests SET variant_b_checkout = variant_b_checkout + 1, updated_at = now() WHERE id = test_id;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_ab_counter"("test_id" "uuid", "variant" "text", "counter_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_coupon_usage"("p_code" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.discount_coupons
  SET usage_count = COALESCE(usage_count, 0) + 1,
      updated_at = now()
  WHERE code = p_code;
END;
$$;


ALTER FUNCTION "public"."increment_coupon_usage"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."init_loyalty_account"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.loyalty_points (user_id, points_balance, total_points_earned, total_points_spent, tier, tier_progress, next_tier_threshold)
  VALUES (p_user_id, 0, 0, 0, 'bronze', 0, 500)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."init_loyalty_account"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.is_user_admin(user_uuid)
$$;


ALTER FUNCTION "public"."is_admin_user"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_authenticated_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;


ALTER FUNCTION "public"."is_authenticated_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_authenticated_user"() IS 'Security function: Returns true only for truly authenticated users (not anonymous). 
Checks both auth.uid() existence AND that is_anonymous flag is false.
Used to prevent anonymous Supabase users from accessing protected resources.';



CREATE OR REPLACE FUNCTION "public"."is_profile_owner"("profile_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT auth.uid() = profile_user_id
$$;


ALTER FUNCTION "public"."is_profile_owner"("profile_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_admin"("_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND role IN ('admin', 'super_admin')
      AND revoked_at IS NULL
  )
$$;


ALTER FUNCTION "public"."is_user_admin"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_user_admin"("_user_id" "uuid") IS 'Helper function to check if user has any admin role';



CREATE OR REPLACE FUNCTION "public"."log_admin_action"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log admin user changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id, 
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'CREATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(NEW), inet_client_addr(), 
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(), 'UPDATE_ADMIN', 'admin_user', NEW.id::text,
      to_jsonb(OLD), to_jsonb(NEW), inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_user_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log admin user data access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    'SELECT',
    'admin_users',
    NEW.id::text,
    jsonb_build_object(
      'accessed_email', LEFT(NEW.email, 2) || '***@' || SPLIT_PART(NEW.email, '@', 2),
      'accessed_role', NEW.role
    ),
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_admin_user_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_contact_message_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  access_count INTEGER;
  is_bulk_access BOOLEAN := false;
BEGIN
  -- Count recent accesses by this user (last 5 minutes)
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND resource_type = 'contact_messages'
    AND action = 'SELECT'
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  -- Flag as bulk access if more than 10 records accessed in 5 minutes
  IF access_count > 10 THEN
    is_bulk_access := true;
  END IF;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    'SELECT',
    'contact_messages',
    NEW.id::text,
    jsonb_build_object(
      'is_bulk_access', is_bulk_access,
      'access_count_5min', access_count + 1,
      'accessed_fields', ARRAY['first_name', 'last_name', 'email', 'phone']
    ),
    inet_client_addr()
  );
  
  -- Create security alert for bulk access
  IF is_bulk_access AND access_count = 11 THEN
    INSERT INTO public.security_alerts (
      alert_type,
      severity,
      title,
      description,
      user_id,
      source_ip,
      metadata
    ) VALUES (
      'bulk_data_access',
      'high',
      'Bulk Contact Data Access Detected',
      'A super admin is accessing contact messages in bulk. This may indicate data exfiltration.',
      auth.uid(),
      inet_client_addr(),
      jsonb_build_object(
        'table', 'contact_messages',
        'access_count', access_count + 1,
        'time_window', '5 minutes'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_contact_message_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_contact_message_access"("message_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  contact_email text;
BEGIN
  -- Get the email from the contact message (only admins can call this)
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  SELECT email INTO contact_email 
  FROM public.contact_messages 
  WHERE id = message_id;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'CONTACT_MESSAGE_ACCESS',
    'contact_message',
    message_id::text,
    jsonb_build_object('email_accessed', public.mask_email(contact_email)),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;


ALTER FUNCTION "public"."log_contact_message_access"("message_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_newsletter_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Log newsletter subscription access for security monitoring
  IF TG_OP = 'SELECT' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'NEWSLETTER_ACCESS',
      'newsletter_subscription',
      NEW.id::text,
      jsonb_build_object('email_accessed', NEW.email),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_newsletter_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_profile_access"("accessed_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  access_count integer;
BEGIN
  -- Log profile access for monitoring
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id,
    new_values, ip_address, user_agent
  ) VALUES (
    auth.uid(),
    'PROFILE_ACCESS',
    'profile',
    accessed_profile_id::text,
    jsonb_build_object(
      'access_time', now(),
      'access_type', 'profile_view'
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Security monitoring: Check for excessive profile access
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action = 'PROFILE_ACCESS'
    AND created_at > now() - interval '1 hour';

  -- Flag suspicious activity
  IF access_count > 20 THEN
    PERFORM public.log_security_event(
      'SUSPICIOUS_PROFILE_ACCESS',
      'high',
      jsonb_build_object(
        'user_id', auth.uid(),
        'access_count', access_count,
        'time_window', '1 hour',
        'detection_reason', 'Excessive profile access attempts'
      ),
      auth.uid()
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."log_profile_access"("accessed_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("event_type" "text", "severity" "text" DEFAULT 'medium'::"text", "details" "jsonb" DEFAULT '{}'::"jsonb", "user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, ip_address, user_agent, event_data
  ) VALUES (
    event_type, 
    severity, 
    COALESCE(user_id, auth.uid()),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    COALESCE(details, '{}'::jsonb)
  );
END;
$$;


ALTER FUNCTION "public"."log_security_event"("event_type" "text", "severity" "text", "details" "jsonb", "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_description" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Insert into audit_logs for activity tracking
  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id, new_values, ip_address, user_agent
  ) VALUES (
    p_user_id, 
    p_activity_type, 
    'user_activity', 
    p_user_id::TEXT,
    jsonb_build_object('description', p_description, 'metadata', p_metadata),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;


ALTER FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_description" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_abandoned_checkout_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.checkout_sessions
  SET 
    status = 'abandoned',
    abandoned_at = now(),
    updated_at = now()
  WHERE 
    status = 'in_progress'
    AND expires_at < now()
    AND order_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."mark_abandoned_checkout_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_alerts_notified"("alert_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.security_alerts
  SET notified_at = now()
  WHERE id = ANY(alert_ids);
END;
$$;


ALTER FUNCTION "public"."mark_alerts_notified"("alert_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_email"("email" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
    SELECT 
        SUBSTRING(email FROM 1 FOR 2) || 
        repeat('*', GREATEST(length(email) - 4, 0)) || 
        SUBSTRING(email FROM GREATEST(length(email) - 1, 1));
$$;


ALTER FUNCTION "public"."mask_email"("email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_phone"("phone_number" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT CASE 
    WHEN phone_number IS NULL OR LENGTH(phone_number) < 4 THEN phone_number
    ELSE SUBSTRING(phone_number FROM 1 FOR 3) || '****' || RIGHT(phone_number, 2)
  END
$$;


ALTER FUNCTION "public"."mask_phone"("phone_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_phone"("phone_number" character varying) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  SELECT public.mask_phone(phone_number::text)
$$;


ALTER FUNCTION "public"."mask_phone"("phone_number" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mask_sensitive_data"("p_email" "text", "p_phone" "text" DEFAULT NULL::"text", "p_full_mask" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  masked_email TEXT;
  masked_phone TEXT;
BEGIN
  -- Mask email: show first 2 chars + domain
  IF p_email IS NOT NULL THEN
    IF p_full_mask THEN
      masked_email := '***@***';
    ELSE
      masked_email := LEFT(p_email, 2) || '***@' || SPLIT_PART(p_email, '@', 2);
    END IF;
  END IF;
  
  -- Mask phone: show last 4 digits only
  IF p_phone IS NOT NULL THEN
    IF p_full_mask THEN
      masked_phone := '***-****';
    ELSE
      masked_phone := '***-' || RIGHT(REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g'), 4);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'masked_email', masked_email,
    'masked_phone', masked_phone
  );
END;
$$;


ALTER FUNCTION "public"."mask_sensitive_data"("p_email" "text", "p_phone" "text", "p_full_mask" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."monitor_admin_users_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Log all modifications to admin_users table
  IF TG_OP = 'INSERT' THEN
    -- Log new admin creation
    PERFORM public.log_security_event(
      'ADMIN_USER_CREATED',
      'high',
      jsonb_build_object(
        'admin_email', NEW.email,
        'admin_role', NEW.role,
        'created_by', auth.uid(),
        'operation', TG_OP
      ),
      auth.uid()
    );
    
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ADMIN_USER_CREATED',
      'admin_users',
      NEW.id::text,
      jsonb_build_object(
        'email', public.mask_email(NEW.email),
        'role', NEW.role,
        'name', NEW.name
      ),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log admin modification with special alert for role changes
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.log_security_event(
        'ADMIN_ROLE_CHANGED',
        'critical',
        jsonb_build_object(
          'admin_email', public.mask_email(NEW.email),
          'old_role', OLD.role,
          'new_role', NEW.role,
          'changed_by', auth.uid()
        ),
        auth.uid()
      );
    END IF;
    
    INSERT INTO public.audit_logs (
      user_id, action, resource_type, resource_id,
      old_values, new_values, ip_address, user_agent
    ) VALUES (
      auth.uid(),
      'ADMIN_USER_UPDATED',
      'admin_users',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'email', public.mask_email(OLD.email)),
      jsonb_build_object('role', NEW.role, 'email', public.mask_email(NEW.email)),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."monitor_admin_users_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."monitor_audit_log_integrity"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result jsonb;
  total_logs integer;
  recent_logs_1h integer;
  flooding_events integer;
  suspicious_patterns integer;
BEGIN
  -- Only super_admins can view these metrics
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  SELECT COUNT(*) INTO total_logs FROM public.audit_logs;
  
  SELECT COUNT(*) INTO recent_logs_1h 
  FROM public.audit_logs 
  WHERE created_at > now() - interval '1 hour';
  
  SELECT COUNT(*) INTO flooding_events
  FROM public.security_events
  WHERE event_type = 'AUDIT_LOG_FLOODING_DETECTED'
    AND created_at > now() - interval '24 hours';
    
  -- Check for suspicious patterns (same action repeated many times by same user)
  SELECT COUNT(*) INTO suspicious_patterns
  FROM (
    SELECT user_id, action, COUNT(*) as cnt
    FROM public.audit_logs
    WHERE created_at > now() - interval '1 hour'
    GROUP BY user_id, action
    HAVING COUNT(*) > 50
  ) suspicious;

  result := jsonb_build_object(
    'total_logs', total_logs,
    'recent_logs_1h', recent_logs_1h,
    'flooding_events_24h', flooding_events,
    'suspicious_patterns_1h', suspicious_patterns,
    'integrity_status', CASE 
      WHEN flooding_events > 0 OR suspicious_patterns > 0 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'checked_at', now()
  );

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."monitor_audit_log_integrity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."monitor_contact_data_security"() RETURNS TABLE("security_metric" "text", "current_value" "text", "risk_level" "text", "recommendation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only admins can view security metrics
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Log security monitoring access
  PERFORM public.log_security_event(
    'CONTACT_SECURITY_MONITORING_ACCESS',
    'low',
    jsonb_build_object(
      'admin_user_id', auth.uid(),
      'monitoring_time', now()
    ),
    auth.uid()
  );

  RETURN QUERY
  WITH security_metrics AS (
    SELECT 
      'Total Contact Messages' as metric,
      COUNT(*)::text as value,
      CASE WHEN COUNT(*) > 10000 THEN 'HIGH' ELSE 'LOW' END as risk,
      'Consider archiving old messages' as rec
    FROM public.contact_messages
    
    UNION ALL
    
    SELECT 
      'Contact Access Events (24h)' as metric,
      COUNT(*)::text as value,
      CASE WHEN COUNT(*) > 100 THEN 'HIGH' WHEN COUNT(*) > 50 THEN 'MEDIUM' ELSE 'LOW' END as risk,
      'Monitor for unusual access patterns' as rec
    FROM public.audit_logs 
    WHERE action LIKE '%CONTACT%' AND created_at > now() - interval '24 hours'
    
    UNION ALL
    
    SELECT 
      'Unique Admins Accessing Contacts (7d)' as metric,
      COUNT(DISTINCT user_id)::text as value,
      CASE WHEN COUNT(DISTINCT user_id) > 5 THEN 'HIGH' ELSE 'LOW' END as risk,
      'Verify all admin access is authorized' as rec
    FROM public.audit_logs 
    WHERE action LIKE '%CONTACT%' AND created_at > now() - interval '7 days'
  )
  SELECT * FROM security_metrics;
END;
$$;


ALTER FUNCTION "public"."monitor_contact_data_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_order_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_order_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."override_fraud_assessment"("p_order_id" "uuid", "p_action" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_order RECORD;
  v_new_status order_status;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify admin permission
  IF NOT public.is_admin_user(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Get order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Determine new status
  v_new_status := CASE p_action
    WHEN 'approve' THEN 'validated'::order_status
    WHEN 'reject' THEN 'cancelled'::order_status
    ELSE NULL
  END;
  
  IF v_new_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Use approve or reject.');
  END IF;
  
  -- Update fraud assessment
  UPDATE public.fraud_assessments
  SET manual_override = true,
      override_by = v_user_id,
      override_reason = p_reason,
      override_at = now()
  WHERE order_id = p_order_id;
  
  -- Update order status
  UPDATE public.orders
  SET order_status = v_new_status,
      requires_attention = false,
      attention_reason = NULL,
      updated_at = now()
  WHERE id = p_order_id;
  
  -- Log status change
  INSERT INTO public.order_status_history (
    order_id, previous_status, new_status, changed_by,
    changed_by_user_id, reason_code, reason_message
  ) VALUES (
    p_order_id, v_order.order_status, v_new_status, 'admin',
    v_user_id, 
    CASE p_action WHEN 'approve' THEN 'FRAUD_OVERRIDE_APPROVE' ELSE 'FRAUD_OVERRIDE_REJECT' END,
    p_reason
  );
  
  -- Resolve fraud anomaly if approving
  IF p_action = 'approve' THEN
    UPDATE public.order_anomalies
    SET resolved_at = now(),
        resolved_by = v_user_id::text,
        resolution_notes = p_reason,
        resolution_action = 'Manual approval by admin',
        updated_at = now()
    WHERE order_id = p_order_id 
      AND anomaly_type = 'fraud' 
      AND resolved_at IS NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_status', v_new_status::text,
    'overridden_by', v_user_id
  );
END;
$$;


ALTER FUNCTION "public"."override_fraud_assessment"("p_order_id" "uuid", "p_action" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."payment_events_unacked_since"("p_since" interval DEFAULT '00:15:00'::interval) RETURNS TABLE("event_type" "text", "severity" "text", "occurrence_count" bigint, "first_seen" timestamp with time zone, "last_seen" timestamp with time zone, "sample_message" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    event_type,
    severity,
    COUNT(*)                                         AS occurrence_count,
    MIN(created_at)                                  AS first_seen,
    MAX(created_at)                                  AS last_seen,
    (ARRAY_AGG(
      error_message
      ORDER BY created_at DESC
    ) FILTER (WHERE error_message IS NOT NULL))[1]   AS sample_message
  FROM public.payment_events_critical
  WHERE created_at >= (now() - p_since)
  GROUP BY event_type, severity
  ORDER BY
    CASE severity
      WHEN 'critical' THEN 1
      WHEN 'error'    THEN 2
      WHEN 'warning'  THEN 3
      ELSE 4
    END,
    last_seen DESC;
$$;


ALTER FUNCTION "public"."payment_events_unacked_since"("p_since" interval) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."payment_events_unacked_since"("p_since" interval) IS 'Aggregate payment_events_critical in a lookback window. Called by the monitor-payment-events edge function for cron polling; default window = 15 minutes.';



CREATE OR REPLACE FUNCTION "public"."resolve_order_anomaly"("p_anomaly_id" "uuid", "p_resolved_by" "uuid", "p_resolution_notes" "text", "p_resolution_action" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_order_id UUID;
  v_remaining_anomalies INTEGER;
BEGIN
  -- Update anomaly
  UPDATE public.order_anomalies
  SET 
    resolved_at = now(),
    resolved_by = p_resolved_by,
    resolution_notes = p_resolution_notes,
    resolution_action = p_resolution_action,
    updated_at = now()
  WHERE id = p_anomaly_id
  RETURNING order_id INTO v_order_id;
  
  IF v_order_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check remaining unresolved anomalies
  SELECT COUNT(*) INTO v_remaining_anomalies
  FROM public.order_anomalies
  WHERE order_id = v_order_id AND resolved_at IS NULL;
  
  -- Update order flags
  UPDATE public.orders
  SET 
    has_anomaly = (v_remaining_anomalies > 0),
    requires_attention = (v_remaining_anomalies > 0),
    attention_reason = CASE 
      WHEN v_remaining_anomalies = 0 THEN NULL 
      ELSE attention_reason 
    END,
    updated_at = now()
  WHERE id = v_order_id;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."resolve_order_anomaly"("p_anomaly_id" "uuid", "p_resolved_by" "uuid", "p_resolution_notes" "text", "p_resolution_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_contact_data_access"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Only super admins can restore access
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'super-admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  -- Drop lockdown policy
  DROP POLICY IF EXISTS "emergency_lockdown_readonly" ON public.contact_messages;
  
  -- Restore normal policies
  CREATE POLICY "secure_admin_contact_access" ON public.contact_messages
  FOR SELECT USING (public.is_admin_user(auth.uid()));

  CREATE POLICY "admin_contact_update" ON public.contact_messages
  FOR UPDATE USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

  CREATE POLICY "admin_contact_delete" ON public.contact_messages
  FOR DELETE USING (public.is_admin_user(auth.uid()));

  -- Log the restoration
  PERFORM public.log_security_event(
    'CONTACT_DATA_ACCESS_RESTORED',
    'high',
    jsonb_build_object(
      'restored_by', auth.uid(),
      'restore_time', now(),
      'previous_state', 'emergency_lockdown'
    ),
    auth.uid()
  );
END;
$$;


ALTER FUNCTION "public"."restore_contact_data_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sanitize_product_html"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Strip script tags and event handlers from details
  IF NEW.details IS NOT NULL THEN
    NEW.details = regexp_replace(NEW.details, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '\s+on\w+\s*=\s*"[^"]*"', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '\s+on\w+\s*=\s*''[^'']*''', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<iframe[^>]*>.*?</iframe>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<object[^>]*>.*?</object>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<embed[^>]*>', '', 'gi');
    NEW.details = regexp_replace(NEW.details, '<form[^>]*>.*?</form>', '', 'gi');
  END IF;
  
  -- Strip script tags and event handlers from care instructions
  IF NEW.care IS NOT NULL THEN
    NEW.care = regexp_replace(NEW.care, '<script[^>]*>.*?</script>', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '\s+on\w+\s*=\s*"[^"]*"', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '\s+on\w+\s*=\s*''[^'']*''', '', 'gi');
    NEW.care = regexp_replace(NEW.care, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sanitize_product_html"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_cart"("p_user_id" "uuid", "p_items" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Delete items not in the new set
  DELETE FROM cart_items
  WHERE user_id = p_user_id
    AND product_id NOT IN (
      SELECT (item->>'product_id')::int
      FROM jsonb_array_elements(p_items) AS item
    );

  -- Upsert all current items
  INSERT INTO cart_items (user_id, product_id, quantity, updated_at)
  SELECT
    p_user_id,
    (item->>'product_id')::int,
    LEAST((item->>'quantity')::int, 99),
    now()
  FROM jsonb_array_elements(p_items) AS item
  WHERE (item->>'product_id')::int IS NOT NULL
    AND (item->>'quantity')::int > 0
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET
    quantity = LEAST(EXCLUDED.quantity, 99),
    updated_at = now();
END;
$$;


ALTER FUNCTION "public"."sync_cart"("p_user_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- When order_status changes, sync status text field
  IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    NEW.status := NEW.order_status::text;
  END IF;
  -- When status text changes but order_status didn't, try to sync back
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.order_status IS NOT DISTINCT FROM OLD.order_status THEN
    BEGIN
      NEW.order_status := NEW.status::order_status;
    EXCEPTION WHEN invalid_text_representation THEN
      -- If status text isn't a valid enum value, keep order_status and override status
      NEW.status := NEW.order_status::text;
    END;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_order_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_product_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.is_available := (NEW.stock_quantity > 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_product_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_error_report_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_error_report_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_loyalty_tier"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_points integer;
  v_new_tier text;
  v_next_threshold integer;
  v_progress numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF auth.uid() != p_user_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT total_points_earned INTO v_total_points
  FROM public.loyalty_points WHERE user_id = p_user_id;

  IF v_total_points IS NULL THEN RETURN; END IF;

  IF v_total_points >= 5000 THEN
    v_new_tier := 'gold'; v_next_threshold := 10000;
  ELSIF v_total_points >= 2000 THEN
    v_new_tier := 'silver'; v_next_threshold := 5000;
  ELSIF v_total_points >= 500 THEN
    v_new_tier := 'bronze'; v_next_threshold := 2000;
  ELSE
    v_new_tier := 'standard'; v_next_threshold := 500;
  END IF;

  v_progress := LEAST((v_total_points::numeric / v_next_threshold::numeric) * 100, 100);

  UPDATE public.loyalty_points
  SET tier = v_new_tier, next_tier_threshold = v_next_threshold,
      tier_progress = v_progress, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_loyalty_tier"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor" DEFAULT 'system'::"public"."status_change_actor", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_reason_code" "text" DEFAULT NULL::"text", "p_reason_message" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_validation JSONB;
  v_old_status public.order_status;
  v_history_id UUID;
BEGIN
  -- Validate the transition
  v_validation := public.validate_order_status_transition(
    p_order_id, p_new_status, p_actor, p_actor_user_id, p_reason_code, p_reason_message
  );
  
  IF NOT (v_validation->>'valid')::boolean THEN
    RETURN v_validation;
  END IF;
  
  -- Get old status for history
  SELECT order_status INTO v_old_status FROM public.orders WHERE id = p_order_id;
  
  -- Update order status
  UPDATE public.orders
  SET 
    order_status = p_new_status,
    status = p_new_status::text, -- Keep legacy field in sync
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Insert into history
  INSERT INTO public.order_status_history (
    order_id, previous_status, new_status, changed_by, changed_by_user_id,
    reason_code, reason_message, metadata, ip_address, user_agent
  )
  VALUES (
    p_order_id, v_old_status, p_new_status, p_actor, p_actor_user_id,
    p_reason_code, p_reason_message, p_metadata,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  )
  RETURNING id INTO v_history_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'old_status', v_old_status::text,
    'new_status', p_new_status::text,
    'history_id', v_history_id,
    'auto_notify', (v_validation->>'auto_notify')::boolean
  );
END;
$$;


ALTER FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_translation_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_translation_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE users.id = auth.uid() 
    AND users.email = subscription_email
  );
$$;


ALTER FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") IS 'Security function: Returns true only if the provided email matches the currently authenticated user''s email. 
Used by RLS policies to ensure users can only access their own newsletter subscription.
Prevents email enumeration as it receives the row''s email value, not user-controlled input.';



CREATE OR REPLACE FUNCTION "public"."validate_audit_log_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  recent_inserts integer;
  valid_actions text[] := ARRAY[
    'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
    'PROFILE_ACCESS', 'PROFILE_UPDATE',
    'ADMIN_USER_CREATED', 'ADMIN_USER_UPDATED', 'ADMIN_USERS_LIST_ACCESS',
    'CONTACT_MESSAGE_ACCESS', 'CONTACT_MESSAGES_BULK_QUERY', 'FULL_CONTACT_MESSAGE_ACCESS',
    'NEWSLETTER_ACCESS', 'ADMIN_NEWSLETTER_ACCESS', 'USER_NEWSLETTER_ACCESS',
    'ROLE_GRANTED', 'ROLE_REVOKED',
    'PAYMENT_DATA_ACCESS',
    'CREATE_ADMIN', 'UPDATE_ADMIN',
    'INSERT_admin_users', 'UPDATE_admin_users',
    'INSERT_products', 'UPDATE_products', 'DELETE_products',
    'INSERT_orders', 'UPDATE_orders',
    'EMERGENCY_CONTACT_DATA_LOCKDOWN', 'CONTACT_DATA_ACCESS_RESTORED',
    'CONTACT_SECURITY_MONITORING_ACCESS',
    'ADMIN_SECURITY_METRICS_ACCESSED'
  ];
BEGIN
  -- 1. Validate required fields
  IF NEW.action IS NULL OR NEW.action = '' THEN
    RAISE EXCEPTION 'Audit log action cannot be null or empty';
  END IF;
  
  IF NEW.resource_type IS NULL OR NEW.resource_type = '' THEN
    RAISE EXCEPTION 'Audit log resource_type cannot be null or empty';
  END IF;

  -- 2. Validate action format (must be alphanumeric with underscores)
  IF NEW.action !~ '^[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Audit log action contains invalid characters';
  END IF;

  -- 3. Prevent future-dated entries
  IF NEW.created_at > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'Audit log entries cannot be future-dated';
  END IF;

  -- 4. Limit action length
  IF length(NEW.action) > 100 THEN
    RAISE EXCEPTION 'Audit log action exceeds maximum length';
  END IF;

  -- 5. Limit resource_type length
  IF length(NEW.resource_type) > 100 THEN
    RAISE EXCEPTION 'Audit log resource_type exceeds maximum length';
  END IF;

  -- 6. Rate limit: detect potential log flooding
  SELECT COUNT(*) INTO recent_inserts
  FROM public.audit_logs
  WHERE created_at > now() - interval '1 minute'
    AND (
      (user_id IS NOT NULL AND user_id = NEW.user_id) OR
      (ip_address IS NOT NULL AND ip_address = NEW.ip_address)
    );

  IF recent_inserts > 100 THEN
    -- Log security event but still allow the insert
    -- This prevents blocking legitimate operations while alerting on suspicious activity
    PERFORM public.log_security_event(
      'AUDIT_LOG_FLOODING_DETECTED',
      'critical',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'ip_address', NEW.ip_address::text,
        'recent_inserts', recent_inserts,
        'time_window', '1 minute',
        'detection_reason', 'Potential audit log flooding attack'
      ),
      NEW.user_id
    );
  END IF;

  -- 7. Sanitize user_agent to prevent injection
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent := LEFT(NEW.user_agent, 500);
  END IF;

  -- 8. Ensure created_at is set to now() if not provided
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."validate_audit_log_entry"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."discount_coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "value" numeric(10,2) NOT NULL,
    "minimum_order_amount" numeric(10,2),
    "maximum_discount_amount" numeric(10,2),
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0,
    "per_user_limit" integer DEFAULT 1,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "applicable_categories" "uuid"[],
    "applicable_products" integer[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "includes_free_shipping" boolean DEFAULT false
);


ALTER TABLE "public"."discount_coupons" OWNER TO "postgres";


COMMENT ON COLUMN "public"."discount_coupons"."includes_free_shipping" IS 'Whether this coupon provides free shipping';



CREATE OR REPLACE FUNCTION "public"."validate_coupon_code"("p_code" "text") RETURNS SETOF "public"."discount_coupons"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT * FROM public.discount_coupons
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (usage_limit IS NULL OR usage_count < usage_limit)
  LIMIT 1;
$$;


ALTER FUNCTION "public"."validate_coupon_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_guest_token"("_guest_id" "text", "_signature" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    hmac(_guest_id::bytea, _secret::bytea, 'sha256'),
    'hex'
  );
  
  RETURN _expected_sig = _signature;
END;
$$;


ALTER FUNCTION "public"."validate_guest_token"("_guest_id" "text", "_signature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_status_transition"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor" DEFAULT 'system'::"public"."status_change_actor", "p_actor_user_id" "uuid" DEFAULT NULL::"uuid", "p_reason_code" "text" DEFAULT NULL::"text", "p_reason_message" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_status public.order_status;
  v_transition RECORD;
  v_permission admin_order_permission;
  v_has_permission BOOLEAN := false;
  v_result JSONB;
BEGIN
  -- Get current order status
  SELECT order_status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id;
  
  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Order not found'
    );
  END IF;
  
  -- Check if transition is valid
  SELECT * INTO v_transition
  FROM public.order_state_transitions
  WHERE from_status = v_current_status
    AND to_status = p_new_status;
  
  IF v_transition IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'INVALID_TRANSITION',
      'message', format('Cannot transition from %s to %s', v_current_status, p_new_status),
      'current_status', v_current_status::text
    );
  END IF;
  
  -- Check if reason is required
  IF v_transition.requires_reason AND (p_reason_message IS NULL OR p_reason_message = '') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'REASON_REQUIRED',
      'message', 'This transition requires a reason'
    );
  END IF;
  
  -- Check permissions for admin/customer
  IF p_actor = 'customer' THEN
    IF NOT v_transition.is_customer_allowed THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'CUSTOMER_NOT_ALLOWED',
        'message', 'Customers cannot perform this action'
      );
    END IF;
    v_has_permission := true;
  ELSIF p_actor = 'admin' AND p_actor_user_id IS NOT NULL THEN
    -- Check admin permission level
    SELECT permission_level INTO v_permission
    FROM public.admin_order_permissions
    WHERE user_id = p_actor_user_id
      AND (expires_at IS NULL OR expires_at > now());
    
    IF v_permission IS NULL THEN
      -- Check if user is in admin_users table
      IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_actor_user_id) THEN
        v_permission := 'operations'::admin_order_permission;
      ELSE
        RETURN jsonb_build_object(
          'valid', false,
          'error', 'NO_ADMIN_PERMISSION',
          'message', 'User does not have admin order permissions'
        );
      END IF;
    END IF;
    
    -- Check if permission level is sufficient
    IF v_transition.requires_permission = 'full_access' AND v_permission != 'full_access' THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'INSUFFICIENT_PERMISSION',
        'message', 'This action requires full access permission'
      );
    ELSIF v_transition.requires_permission = 'operations' AND v_permission = 'read_only' THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'INSUFFICIENT_PERMISSION',
        'message', 'This action requires operations permission'
      );
    END IF;
    v_has_permission := true;
  ELSIF p_actor IN ('system', 'webhook', 'scheduler') THEN
    v_has_permission := true;
  END IF;
  
  IF NOT v_has_permission THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'PERMISSION_DENIED',
      'message', 'Permission denied for this transition'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'from_status', v_current_status::text,
    'to_status', p_new_status::text,
    'auto_notify', v_transition.auto_notify_customer
  );
END;
$$;


ALTER FUNCTION "public"."validate_order_status_transition"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_admin_session"() RETURNS TABLE("is_admin" boolean, "admin_role" "text", "admin_name" "text", "admin_email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_is_admin boolean := false;
    v_role text := null;
    v_name text := null;
    v_email text := null;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT false, null::text, null::text, null::text;
        RETURN;
    END IF;
    
    -- Check user_roles table (single source of truth for RBAC)
    SELECT 
        true,
        ur.role::text
    INTO v_is_admin, v_role
    FROM user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role IN ('admin', 'super_admin')
      AND ur.revoked_at IS NULL
    ORDER BY CASE ur.role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
    END
    LIMIT 1;
    
    -- Get name/email from admin_users if exists (display only)
    IF v_is_admin THEN
        SELECT au.name, au.email
        INTO v_name, v_email
        FROM admin_users au
        WHERE au.user_id = v_user_id;
    END IF;
    
    RETURN QUERY SELECT 
        COALESCE(v_is_admin, false),
        v_role,
        COALESCE(v_name, ''::text),
        COALESCE(v_email, ''::text);
END;
$$;


ALTER FUNCTION "public"."verify_admin_session"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ab_theme_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" DEFAULT 'theme-test'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "variant_a" "text" DEFAULT 'modern'::"text" NOT NULL,
    "variant_b" "text" DEFAULT 'legacy'::"text" NOT NULL,
    "split_percentage" integer DEFAULT 50 NOT NULL,
    "variant_a_views" integer DEFAULT 0 NOT NULL,
    "variant_b_views" integer DEFAULT 0 NOT NULL,
    "variant_a_add_to_cart" integer DEFAULT 0 NOT NULL,
    "variant_b_add_to_cart" integer DEFAULT 0 NOT NULL,
    "variant_a_checkout" integer DEFAULT 0 NOT NULL,
    "variant_b_checkout" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ab_theme_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_order_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permission_level" "public"."admin_order_permission" DEFAULT 'read_only'::"public"."admin_order_permission" NOT NULL,
    "can_override_transitions" boolean DEFAULT false,
    "can_force_status" boolean DEFAULT false,
    "can_resolve_anomalies" boolean DEFAULT false,
    "can_process_refunds" boolean DEFAULT false,
    "can_view_fraud_data" boolean DEFAULT false,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_order_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'admin'::"text" NOT NULL,
    "last_login" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'super-admin'::"text"])))
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_users" IS 'DEPRECATED for authorization - use user_roles table. This table now stores only admin metadata.';



CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_key" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artisan_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "artisan_id" "uuid" NOT NULL,
    "locale" "text" NOT NULL,
    "bio" "text",
    "bio_short" "text",
    "specialty" "text",
    "quote" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."artisan_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."artisans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "photo_url" "text",
    "bio" "text",
    "bio_short" "text",
    "location" "text",
    "region" "text",
    "experience_years" integer,
    "specialty" "text",
    "techniques" "text"[],
    "quote" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."artisans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "text",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_logs_action_check" CHECK ((("action" ~ '^[A-Za-z0-9_]+$'::"text") AND ("length"("action") <= 100))),
    CONSTRAINT "audit_logs_resource_type_check" CHECK ((("resource_type" ~ '^[A-Za-z0-9_]+$'::"text") AND ("length"("resource_type") <= 100)))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."back_in_stock_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer NOT NULL,
    "email" "text" NOT NULL,
    "user_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."back_in_stock_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_post_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blog_post_id" "uuid" NOT NULL,
    "locale" "text" NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "blog_post_translations_locale_check" CHECK (("locale" = ANY (ARRAY['fr'::"text", 'en'::"text", 'ar'::"text", 'es'::"text", 'de'::"text"])))
);


ALTER TABLE "public"."blog_post_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "excerpt" "text",
    "content" "text" NOT NULL,
    "featured_image_url" "text",
    "author_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text",
    "is_featured" boolean DEFAULT false,
    "tags" "text"[],
    "seo_title" "text",
    "seo_description" "text",
    "published_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" integer,
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK ((("quantity" > 0) AND ("quantity" <= 99))),
    CONSTRAINT "cart_items_quantity_limit" CHECK ((("quantity" >= 1) AND ("quantity" <= 100)))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "parent_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "seo_title" "text",
    "seo_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guest_id" "text",
    "user_id" "uuid",
    "current_step" integer DEFAULT 1 NOT NULL,
    "last_completed_step" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "personal_info" "jsonb",
    "shipping_info" "jsonb",
    "promo_code" "text",
    "promo_code_valid" boolean,
    "promo_discount_type" "text",
    "promo_discount_value" numeric,
    "promo_discount_applied" numeric,
    "promo_free_shipping" boolean DEFAULT false,
    "cart_items" "jsonb",
    "subtotal" numeric DEFAULT 0,
    "shipping_cost" numeric DEFAULT 0,
    "total" numeric DEFAULT 0,
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "client_ip" "text",
    "client_country" "text",
    "order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "abandoned_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    CONSTRAINT "checkout_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text", 'payment_failed'::"text"])))
);


ALTER TABLE "public"."checkout_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."checkout_sessions"."personal_info" IS 'SENSITIVE: Contains customer PII (email, phone, name). Access restricted by RLS.';



COMMENT ON COLUMN "public"."checkout_sessions"."shipping_info" IS 'SENSITIVE: Contains customer address. Access restricted by RLS.';



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "company" "text",
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "contact_messages_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'read'::"text", 'replied'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."contact_messages_masked" WITH ("security_invoker"='true') AS
 SELECT "cm"."id",
    ("left"("cm"."first_name", 1) || '***'::"text") AS "first_name",
    ("left"("cm"."last_name", 1) || '***'::"text") AS "last_name",
    (("left"("cm"."email", 2) || '***@'::"text") || "split_part"("cm"."email", '@'::"text", 2)) AS "email",
        CASE
            WHEN ("cm"."phone" IS NOT NULL) THEN ('***-'::"text" || "right"("regexp_replace"("cm"."phone", '[^0-9]'::"text", ''::"text", 'g'::"text"), 4))
            ELSE NULL::"text"
        END AS "phone",
    "cm"."company",
    "cm"."subject",
    ("left"("cm"."message", 100) ||
        CASE
            WHEN ("length"("cm"."message") > 100) THEN '...'::"text"
            ELSE ''::"text"
        END) AS "message_preview",
    "cm"."status",
    "cm"."created_at",
    "cm"."updated_at",
    NULL::"inet" AS "ip_address"
   FROM "public"."contact_messages" "cm"
  WHERE "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role");


ALTER TABLE "public"."contact_messages_masked" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."edge_rate_limits" (
    "identifier" "text" NOT NULL,
    "count" integer NOT NULL,
    "window_end" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."edge_rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."edge_rate_limits" IS 'Cross-isolate rate-limit state for Supabase Edge Functions. Managed via public.edge_rate_limit_consume(); do not UPDATE directly.';



CREATE TABLE IF NOT EXISTS "public"."email_ab_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "variant_a_subject" "text",
    "variant_b_subject" "text",
    "variant_a_sent" integer DEFAULT 0 NOT NULL,
    "variant_b_sent" integer DEFAULT 0 NOT NULL,
    "variant_a_opens" integer DEFAULT 0 NOT NULL,
    "variant_b_opens" integer DEFAULT 0 NOT NULL,
    "split_percentage" integer DEFAULT 50 NOT NULL,
    "winner" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."email_ab_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "order_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."email_logs_masked" WITH ("security_invoker"='true') AS
 SELECT "el"."id",
    "public"."mask_email"("el"."recipient_email") AS "recipient_email",
    ("left"(COALESCE("el"."recipient_name", ''::"text"), 1) || '***'::"text") AS "recipient_name",
    "el"."template_name",
    "el"."status",
    "el"."sent_at",
    "el"."created_at",
    "el"."order_id"
   FROM "public"."email_logs" "el"
  WHERE "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role");


ALTER TABLE "public"."email_logs_masked" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fraud_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "total_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "risk_level" "text" NOT NULL,
    "triggered_rules" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "assessment_data" "jsonb" DEFAULT '{}'::"jsonb",
    "auto_action" "text",
    "manual_override" boolean DEFAULT false,
    "override_by" "uuid",
    "override_reason" "text",
    "override_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fraud_assessments_auto_action_check" CHECK (("auto_action" = ANY (ARRAY['approve'::"text", 'hold'::"text", 'reject'::"text", 'manual_review'::"text"]))),
    CONSTRAINT "fraud_assessments_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."fraud_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fraud_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "rule_name" "text" NOT NULL,
    "rule_type" "text" NOT NULL,
    "description" "text",
    "score_impact" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true,
    "parameters" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fraud_rules_rule_type_check" CHECK (("rule_type" = ANY (ARRAY['address'::"text", 'payment'::"text", 'behavior'::"text", 'velocity'::"text", 'device'::"text"])))
);


ALTER TABLE "public"."fraud_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hero_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_url" "text" NOT NULL,
    "alt_text" "text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."hero_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "invoice_number" "text" NOT NULL,
    "json_snapshot" "jsonb" NOT NULL,
    "html" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points_balance" integer DEFAULT 0 NOT NULL,
    "total_points_earned" integer DEFAULT 0 NOT NULL,
    "total_points_spent" integer DEFAULT 0 NOT NULL,
    "tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "tier_progress" integer DEFAULT 0 NOT NULL,
    "next_tier_threshold" integer DEFAULT 500 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loyalty_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "points_spent" integer NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_redemption_status" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."loyalty_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "reward_type" "text" NOT NULL,
    "reward_value" "jsonb" NOT NULL,
    "min_tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "usage_limit" integer,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"(),
    "valid_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_min_tier" CHECK (("min_tier" = ANY (ARRAY['bronze'::"text", 'silver'::"text", 'gold'::"text", 'platinum'::"text"]))),
    CONSTRAINT "valid_reward_type" CHECK (("reward_type" = ANY (ARRAY['discount'::"text", 'free_shipping'::"text", 'product'::"text"])))
);


ALTER TABLE "public"."loyalty_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points_change" integer NOT NULL,
    "transaction_type" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "source_id" "text",
    "description" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "valid_source_type" CHECK (("source_type" = ANY (ARRAY['order'::"text", 'review'::"text", 'referral'::"text", 'manual'::"text", 'signup_bonus'::"text"]))),
    CONSTRAINT "valid_transaction_type" CHECK (("transaction_type" = ANY (ARRAY['earned'::"text", 'spent'::"text", 'bonus'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."newsletter_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "source" "text",
    "consent_given" boolean DEFAULT true,
    "consent_date" timestamp with time zone DEFAULT "now"(),
    "double_opt_in" boolean DEFAULT false,
    "confirmed_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone,
    "tags" "text"[],
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."newsletter_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_order_confirmation" boolean DEFAULT true,
    "email_shipping_updates" boolean DEFAULT true,
    "email_delivery_confirmation" boolean DEFAULT true,
    "email_promotional" boolean DEFAULT true,
    "email_loyalty_updates" boolean DEFAULT true,
    "email_security_alerts" boolean DEFAULT true,
    "sms_order_updates" boolean DEFAULT false,
    "sms_delivery_updates" boolean DEFAULT false,
    "push_order_updates" boolean DEFAULT true,
    "push_promotional" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_anomalies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "anomaly_type" "public"."order_anomaly_type" NOT NULL,
    "severity" "public"."anomaly_severity" DEFAULT 'medium'::"public"."anomaly_severity" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detected_by" "public"."status_change_actor" DEFAULT 'system'::"public"."status_change_actor" NOT NULL,
    "auto_resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "resolution_action" "text",
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "next_retry_at" timestamp with time zone,
    "escalated" boolean DEFAULT false,
    "escalated_at" timestamp with time zone,
    "escalated_to" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_anomalies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" integer,
    "quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total_price" numeric(10,2) NOT NULL,
    "product_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_state_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_status" "public"."order_status" NOT NULL,
    "to_status" "public"."order_status" NOT NULL,
    "requires_permission" "public"."admin_order_permission" DEFAULT 'operations'::"public"."admin_order_permission",
    "is_customer_allowed" boolean DEFAULT false,
    "requires_reason" boolean DEFAULT false,
    "auto_notify_customer" boolean DEFAULT true,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_state_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_customer_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "internal_status" "public"."order_status" NOT NULL,
    "customer_status_key" "text" NOT NULL,
    "customer_status_label_fr" "text" NOT NULL,
    "customer_status_label_en" "text" NOT NULL,
    "customer_description_fr" "text",
    "customer_description_en" "text",
    "show_to_customer" boolean DEFAULT true,
    "display_order" integer,
    "icon_name" "text",
    "color_class" "text"
);


ALTER TABLE "public"."order_status_customer_mapping" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "previous_status" "public"."order_status",
    "new_status" "public"."order_status" NOT NULL,
    "changed_by" "public"."status_change_actor" DEFAULT 'system'::"public"."status_change_actor" NOT NULL,
    "changed_by_user_id" "uuid",
    "reason_code" "text",
    "reason_message" "text",
    "free_comment" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_session_id" "text",
    "amount" integer,
    "currency" "text" DEFAULT 'eur'::"text",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_status" "public"."order_status" DEFAULT 'created'::"public"."order_status",
    "payment_method" "text",
    "payment_reference" "text",
    "fraud_score" numeric(5,2),
    "fraud_flags" "jsonb" DEFAULT '[]'::"jsonb",
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "customer_notes" "text",
    "internal_notes" "text",
    "estimated_delivery" timestamp with time zone,
    "actual_delivery" timestamp with time zone,
    "carrier" "text",
    "tracking_number" "text",
    "tracking_url" "text",
    "retry_count" integer DEFAULT 0,
    "last_retry_at" timestamp with time zone,
    "has_anomaly" boolean DEFAULT false,
    "anomaly_count" integer DEFAULT 0,
    "requires_attention" boolean DEFAULT false,
    "attention_reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "checkout_session_id" "uuid",
    "pricing_snapshot" "jsonb",
    "subtotal_amount" bigint,
    "discount_amount" bigint,
    "shipping_amount" bigint,
    "total_amount" bigint
);

ALTER TABLE ONLY "public"."orders" REPLICA IDENTITY FULL;


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."amount" IS 'Amount in cents (EUR). Orders before 2026-02-09 may store euros instead of cents.';



COMMENT ON COLUMN "public"."orders"."pricing_snapshot" IS 'Immutable pricing breakdown after payment (Stripe checkout.session.completed). Versioned JSON; UI and email must prefer this over recomputation.';



COMMENT ON COLUMN "public"."orders"."subtotal_amount" IS 'Subtotal in smallest currency unit (e.g. cents), from Stripe at payment time.';



COMMENT ON COLUMN "public"."orders"."discount_amount" IS 'Total discount in smallest currency unit, from Stripe total_details.amount_discount.';



COMMENT ON COLUMN "public"."orders"."shipping_amount" IS 'Shipping in smallest currency unit, from Stripe total_details.amount_shipping.';



COMMENT ON COLUMN "public"."orders"."total_amount" IS 'Grand total in smallest currency unit (session.amount_total). NULL on rows that pre-date the pricing snapshot and whose legacy amount unit cannot be proven.';



CREATE TABLE IF NOT EXISTS "public"."payment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "correlation_id" "text",
    "event_type" "text" NOT NULL,
    "status" "text" DEFAULT 'info'::"text" NOT NULL,
    "actor" "text" DEFAULT 'system'::"text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "ip_address" "text",
    "user_agent" "text",
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_events" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."payment_events_critical" AS
 SELECT "e"."id",
    "e"."order_id",
    "e"."correlation_id",
    "e"."event_type",
    "e"."status",
    "e"."actor",
    "e"."details",
    "e"."error_message",
    "e"."ip_address",
    "e"."user_agent",
    "e"."duration_ms",
    "e"."created_at",
        CASE "e"."event_type"
            WHEN 'webhook_signature_invalid'::"text" THEN 'critical'::"text"
            WHEN 'webhook_unsigned_rejected'::"text" THEN 'critical'::"text"
            WHEN 'webhook_unsigned_accepted'::"text" THEN 'critical'::"text"
            WHEN 'webhook_confirmation_failed'::"text" THEN 'error'::"text"
            WHEN 'webhook_missing_order_id'::"text" THEN 'error'::"text"
            WHEN 'pricing_snapshot_persist_failed'::"text" THEN 'warning'::"text"
            WHEN 'payment_failed'::"text" THEN 'error'::"text"
            WHEN 'payment_initiation_failed'::"text" THEN 'error'::"text"
            ELSE 'info'::"text"
        END AS "severity"
   FROM "public"."payment_events" "e"
  WHERE ("e"."event_type" = ANY (ARRAY['webhook_signature_invalid'::"text", 'webhook_unsigned_rejected'::"text", 'webhook_unsigned_accepted'::"text", 'webhook_confirmation_failed'::"text", 'webhook_missing_order_id'::"text", 'pricing_snapshot_persist_failed'::"text", 'payment_failed'::"text", 'payment_initiation_failed'::"text"]));


ALTER TABLE "public"."payment_events_critical" OWNER TO "postgres";


COMMENT ON VIEW "public"."payment_events_critical" IS 'Whitelisted critical payment_events with computed severity tier. Poll via edge/monitor-payment-events or the payment_events_unacked_since(interval) SQL function. Schema mirrors payment_events + `severity` text.';



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "stripe_payment_intent_id" "text",
    "stripe_payment_method_id" "text",
    "amount" numeric(10,2) NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "payment_method" "text",
    "transaction_fee" numeric(10,2),
    "net_amount" numeric(10,2),
    "processed_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "refund_amount" numeric(10,2),
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "referrer" "text",
    "user_agent" "text",
    "ip_address" "inet",
    "country_code" "text",
    "city" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer,
    "category_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer,
    "user_id" "uuid",
    "rating" integer NOT NULL,
    "title" "text",
    "comment" "text",
    "is_verified_purchase" boolean DEFAULT false,
    "is_approved" boolean DEFAULT false,
    "helpful_count" integer DEFAULT 0,
    "reported_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "photo_urls" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "product_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."product_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" integer NOT NULL,
    "locale" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "short_description" "text",
    "details" "text" NOT NULL,
    "care" "text" NOT NULL,
    "artisan_story" "text",
    "seo_title" "text",
    "seo_description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "material" "text",
    CONSTRAINT "product_translations_locale_check" CHECK (("locale" = ANY (ARRAY['fr'::"text", 'en'::"text", 'ar'::"text", 'es'::"text", 'de'::"text"])))
);


ALTER TABLE "public"."product_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "category" "text" NOT NULL,
    "description" "text" NOT NULL,
    "details" "text" NOT NULL,
    "care" "text" NOT NULL,
    "is_new" boolean DEFAULT false,
    "artisan" "text" NOT NULL,
    "artisan_story" "text",
    "related_products" integer[] DEFAULT '{}'::integer[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text",
    "short_description" "text",
    "stock_quantity" integer DEFAULT 0,
    "min_stock_level" integer DEFAULT 5,
    "weight_grams" integer,
    "dimensions_cm" "text",
    "material" "text",
    "color" "text",
    "is_featured" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "seo_title" "text",
    "seo_description" "text",
    "rating_average" numeric(3,2) DEFAULT 0,
    "rating_count" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "artisan_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" character varying(20),
    "location" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100),
    "website_url" "text",
    "instagram_handle" character varying(100),
    "facebook_url" "text",
    "twitter_handle" character varying(100),
    "preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "notification_settings" "jsonb" DEFAULT '{"order_updates": true, "email_marketing": true, "loyalty_updates": true, "security_alerts": true}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profiles_masked" WITH ("security_invoker"='true') AS
 SELECT "profiles"."id",
        CASE
            WHEN ("public"."is_profile_owner"("profiles"."id") OR "public"."is_admin_user"("auth"."uid"())) THEN "profiles"."full_name"
            ELSE (SUBSTRING("profiles"."full_name" FROM 1 FOR 2) || '***'::"text")
        END AS "full_name",
        CASE
            WHEN "public"."is_profile_owner"("profiles"."id") THEN "profiles"."phone"
            WHEN "public"."is_admin_user"("auth"."uid"()) THEN ("public"."mask_phone"(("profiles"."phone")::"text"))::character varying
            ELSE NULL::character varying
        END AS "phone",
        CASE
            WHEN "public"."is_profile_owner"("profiles"."id") THEN "profiles"."address_line1"
            ELSE '*** (hidden)'::"text"
        END AS "address_line1",
        CASE
            WHEN "public"."is_profile_owner"("profiles"."id") THEN "profiles"."address_line2"
            ELSE NULL::"text"
        END AS "address_line2",
    "profiles"."city",
        CASE
            WHEN ("public"."is_profile_owner"("profiles"."id") OR "public"."is_admin_user"("auth"."uid"())) THEN ("profiles"."postal_code")::"text"
            ELSE (SUBSTRING("profiles"."postal_code" FROM 1 FOR 2) || '***'::"text")
        END AS "postal_code",
    "profiles"."country",
        CASE
            WHEN ("public"."is_profile_owner"("profiles"."id") OR "public"."is_admin_user"("auth"."uid"())) THEN "profiles"."bio"
            ELSE NULL::"text"
        END AS "bio",
    "profiles"."avatar_url",
    "profiles"."created_at",
    "profiles"."updated_at"
   FROM "public"."profiles";


ALTER TABLE "public"."profiles_masked" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "attempts" integer DEFAULT 1 NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "scheduled_for" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "email_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scheduled_emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "alert_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "source_ip" "inet",
    "user_id" "uuid",
    "user_email" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "is_resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_notes" "text",
    "notified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "setting_name" "text" NOT NULL,
    "setting_value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."security_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'medium'::"text" NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "event_data" "jsonb" NOT NULL,
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "carrier" "text",
    "tracking_number" "text",
    "status" "text",
    "expected_delivery" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shipments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "is_default" boolean DEFAULT false,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "company" "text",
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text" NOT NULL,
    "state_province" "text",
    "postal_code" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "phone" "text",
    "delivery_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shipping_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "postal_codes" "jsonb" NOT NULL,
    "delivery_days_min" integer DEFAULT 2 NOT NULL,
    "delivery_days_max" integer DEFAULT 5 NOT NULL,
    "shipping_cost" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "free_shipping_threshold" numeric(10,2) DEFAULT NULL::numeric,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shipping_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "sender_id" "uuid",
    "sender_email" "text",
    "sender_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "attachments" "text"[],
    "is_internal" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "category" "text",
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets_error_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "error_type" "text" DEFAULT 'bug_report'::"text" NOT NULL,
    "page_url" "text",
    "user_agent" "text",
    "description" "text" NOT NULL,
    "screenshot_url" "text",
    "priority" "text" DEFAULT 'low'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "browser_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "masked_email" "text" GENERATED ALWAYS AS ("public"."mask_email"("email")) STORED,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "assigned_to" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "severity" "text" DEFAULT 'low'::"text",
    CONSTRAINT "support_tickets_error_reports_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "support_tickets_error_reports_severity_check" CHECK (("severity" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"]))),
    CONSTRAINT "support_tickets_error_reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_tickets_error_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tag_key" "text" NOT NULL,
    "fr" "text" NOT NULL,
    "en" "text",
    "ar" "text",
    "es" "text",
    "de" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tag_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "marketing_emails" boolean DEFAULT false,
    "order_updates" boolean DEFAULT true,
    "language" character varying(10) DEFAULT 'fr'::character varying,
    "currency" character varying(10) DEFAULT 'EUR'::character varying,
    "privacy_profile_public" boolean DEFAULT false,
    "privacy_show_email" boolean DEFAULT false,
    "privacy_show_phone" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme_preference" character varying(20) DEFAULT 'light'::character varying,
    "timezone" character varying(50) DEFAULT 'Europe/Paris'::character varying
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "granted_by" "uuid",
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid",
    "notes" "text"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_roles" IS 'Secure role management table - roles stored separately from user identity to prevent privilege escalation';



CREATE TABLE IF NOT EXISTS "public"."wishlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."wishlist" OWNER TO "postgres";


ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ab_theme_tests"
    ADD CONSTRAINT "ab_theme_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_order_permissions"
    ADD CONSTRAINT "admin_order_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_order_permissions"
    ADD CONSTRAINT "admin_order_permissions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_setting_key_key" UNIQUE ("setting_key");



ALTER TABLE ONLY "public"."artisan_translations"
    ADD CONSTRAINT "artisan_translations_artisan_id_locale_key" UNIQUE ("artisan_id", "locale");



ALTER TABLE ONLY "public"."artisan_translations"
    ADD CONSTRAINT "artisan_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artisans"
    ADD CONSTRAINT "artisans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."artisans"
    ADD CONSTRAINT "artisans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."back_in_stock_notifications"
    ADD CONSTRAINT "back_in_stock_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_post_translations"
    ADD CONSTRAINT "blog_post_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "discount_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edge_rate_limits"
    ADD CONSTRAINT "edge_rate_limits_pkey" PRIMARY KEY ("identifier");



ALTER TABLE ONLY "public"."email_ab_tests"
    ADD CONSTRAINT "email_ab_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_assessments"
    ADD CONSTRAINT "fraud_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_rules"
    ADD CONSTRAINT "fraud_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_rules"
    ADD CONSTRAINT "fraud_rules_rule_name_key" UNIQUE ("rule_name");



ALTER TABLE ONLY "public"."hero_images"
    ADD CONSTRAINT "hero_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_invoice_number_key" UNIQUE ("invoice_number");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_rewards"
    ADD CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."newsletter_subscriptions"
    ADD CONSTRAINT "newsletter_subscriptions_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."newsletter_subscriptions"
    ADD CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."order_anomalies"
    ADD CONSTRAINT "order_anomalies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_state_transitions"
    ADD CONSTRAINT "order_state_transitions_from_status_to_status_key" UNIQUE ("from_status", "to_status");



ALTER TABLE ONLY "public"."order_state_transitions"
    ADD CONSTRAINT "order_state_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_customer_mapping"
    ADD CONSTRAINT "order_status_customer_mapping_internal_status_key" UNIQUE ("internal_status");



ALTER TABLE ONLY "public"."order_status_customer_mapping"
    ADD CONSTRAINT "order_status_customer_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."product_analytics"
    ADD CONSTRAINT "product_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_product_id_category_id_key" UNIQUE ("product_id", "category_id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "product_reviews_product_id_user_id_key" UNIQUE ("product_id", "user_id");



ALTER TABLE ONLY "public"."product_translations"
    ADD CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_identifier_action_type_key" UNIQUE ("identifier", "action_type");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_emails"
    ADD CONSTRAINT "scheduled_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_alerts"
    ADD CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_config"
    ADD CONSTRAINT "security_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_config"
    ADD CONSTRAINT "security_config_setting_name_key" UNIQUE ("setting_name");



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "shipping_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipping_zones"
    ADD CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets_error_reports"
    ADD CONSTRAINT "support_tickets_error_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_translations"
    ADD CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag_translations"
    ADD CONSTRAINT "tag_translations_tag_key_key" UNIQUE ("tag_key");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "uniq_payment_per_order" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."blog_post_translations"
    ADD CONSTRAINT "unique_blog_post_locale" UNIQUE ("blog_post_id", "locale");



ALTER TABLE ONLY "public"."back_in_stock_notifications"
    ADD CONSTRAINT "unique_product_email" UNIQUE ("product_id", "email");



ALTER TABLE ONLY "public"."product_translations"
    ADD CONSTRAINT "unique_product_locale" UNIQUE ("product_id", "locale");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_user_id_product_id_key" UNIQUE ("user_id", "product_id");



CREATE UNIQUE INDEX "email_logs_order_template_sent_unique" ON "public"."email_logs" USING "btree" ("order_id", "template_name") WHERE (("status" = 'sent'::"text") AND ("order_id" IS NOT NULL));



COMMENT ON INDEX "public"."email_logs_order_template_sent_unique" IS 'Idempotency guard: at most one successful send per (order, template). Callers that observe a unique_violation on insert can treat it as "already sent" and skip the outbound call.';



CREATE INDEX "idx_admin_order_permissions_granted_by" ON "public"."admin_order_permissions" USING "btree" ("granted_by");



CREATE INDEX "idx_audit_logs_action_created_at" ON "public"."audit_logs" USING "btree" ("action", "created_at");



CREATE INDEX "idx_audit_logs_ip_address_created_at" ON "public"."audit_logs" USING "btree" ("ip_address", "created_at");



CREATE INDEX "idx_bisn_email" ON "public"."back_in_stock_notifications" USING "btree" ("email");



CREATE INDEX "idx_bisn_product_status" ON "public"."back_in_stock_notifications" USING "btree" ("product_id", "status");



CREATE INDEX "idx_blog_post_translations_post_locale" ON "public"."blog_post_translations" USING "btree" ("blog_post_id", "locale");



CREATE INDEX "idx_blog_posts_author_id" ON "public"."blog_posts" USING "btree" ("author_id");



CREATE INDEX "idx_blog_posts_status" ON "public"."blog_posts" USING "btree" ("status");



CREATE INDEX "idx_cart_items_product_id" ON "public"."cart_items" USING "btree" ("product_id");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_categories_slug" ON "public"."categories" USING "btree" ("slug");



CREATE INDEX "idx_checkout_sessions_created_at" ON "public"."checkout_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_checkout_sessions_guest_id" ON "public"."checkout_sessions" USING "btree" ("guest_id");



CREATE INDEX "idx_checkout_sessions_order_id" ON "public"."checkout_sessions" USING "btree" ("order_id");



CREATE INDEX "idx_checkout_sessions_status" ON "public"."checkout_sessions" USING "btree" ("status");



CREATE INDEX "idx_checkout_sessions_user_id" ON "public"."checkout_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_discount_coupons_created_by" ON "public"."discount_coupons" USING "btree" ("created_by");



CREATE INDEX "idx_edge_rate_limits_window_end" ON "public"."edge_rate_limits" USING "btree" ("window_end");



CREATE INDEX "idx_email_logs_created_at" ON "public"."email_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_logs_order_id" ON "public"."email_logs" USING "btree" ("order_id");



CREATE INDEX "idx_error_reports_assigned_to" ON "public"."support_tickets_error_reports" USING "btree" ("assigned_to");



CREATE INDEX "idx_error_reports_user_id" ON "public"."support_tickets_error_reports" USING "btree" ("user_id");



CREATE INDEX "idx_fraud_assessments_order_id" ON "public"."fraud_assessments" USING "btree" ("order_id");



CREATE INDEX "idx_fraud_assessments_override_by" ON "public"."fraud_assessments" USING "btree" ("override_by");



CREATE INDEX "idx_hero_images_created_by" ON "public"."hero_images" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invoices_order_id" ON "public"."invoices" USING "btree" ("order_id");



CREATE INDEX "idx_loyalty_redemptions_order_id" ON "public"."loyalty_redemptions" USING "btree" ("order_id");



CREATE INDEX "idx_loyalty_redemptions_reward_id" ON "public"."loyalty_redemptions" USING "btree" ("reward_id");



CREATE INDEX "idx_loyalty_redemptions_user_id" ON "public"."loyalty_redemptions" USING "btree" ("user_id");



CREATE INDEX "idx_loyalty_transactions_user_id" ON "public"."loyalty_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_newsletter_status" ON "public"."newsletter_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_notification_preferences_user_id" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_order_anomalies_escalated_to" ON "public"."order_anomalies" USING "btree" ("escalated_to");



CREATE INDEX "idx_order_anomalies_order_id" ON "public"."order_anomalies" USING "btree" ("order_id");



CREATE INDEX "idx_order_anomalies_resolved_by" ON "public"."order_anomalies" USING "btree" ("resolved_by");



CREATE INDEX "idx_order_anomalies_unresolved" ON "public"."order_anomalies" USING "btree" ("detected_at" DESC) WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_status_history_created_at" ON "public"."order_status_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_order_status_history_order_id" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_orders_checkout_session_id" ON "public"."orders" USING "btree" ("checkout_session_id");



CREATE UNIQUE INDEX "idx_orders_payment_reference_unique" ON "public"."orders" USING "btree" ("payment_reference") WHERE ("payment_reference" IS NOT NULL);



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_stripe_session_id" ON "public"."orders" USING "btree" ("stripe_session_id");



CREATE UNIQUE INDEX "idx_orders_stripe_session_id_unique" ON "public"."orders" USING "btree" ("stripe_session_id") WHERE ("stripe_session_id" IS NOT NULL);



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_osh_changed_by_user_id" ON "public"."order_status_history" USING "btree" ("changed_by_user_id");



CREATE INDEX "idx_payment_events_correlation_id" ON "public"."payment_events" USING "btree" ("correlation_id");



CREATE INDEX "idx_payment_events_created_at" ON "public"."payment_events" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payment_events_order_id" ON "public"."payment_events" USING "btree" ("order_id");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_product_analytics_product_id" ON "public"."product_analytics" USING "btree" ("product_id");



CREATE INDEX "idx_product_analytics_user_id" ON "public"."product_analytics" USING "btree" ("user_id");



CREATE INDEX "idx_product_categories_category_id" ON "public"."product_categories" USING "btree" ("category_id");



CREATE INDEX "idx_product_reviews_product_id" ON "public"."product_reviews" USING "btree" ("product_id");



CREATE INDEX "idx_product_reviews_user_id" ON "public"."product_reviews" USING "btree" ("user_id");



CREATE INDEX "idx_product_translations_locale" ON "public"."product_translations" USING "btree" ("locale");



CREATE INDEX "idx_product_translations_locale_product_id" ON "public"."product_translations" USING "btree" ("locale", "product_id");



CREATE INDEX "idx_product_translations_product_locale" ON "public"."product_translations" USING "btree" ("product_id", "locale");



CREATE INDEX "idx_products_artisan_id" ON "public"."products" USING "btree" ("artisan_id");



CREATE INDEX "idx_security_config_created_by" ON "public"."security_config" USING "btree" ("created_by");



CREATE INDEX "idx_security_events_detected_at" ON "public"."security_events" USING "btree" ("detected_at");



CREATE INDEX "idx_security_events_user_id" ON "public"."security_events" USING "btree" ("user_id");



CREATE INDEX "idx_shipments_order_id" ON "public"."shipments" USING "btree" ("order_id");



CREATE UNIQUE INDEX "idx_shipments_tracking_number" ON "public"."shipments" USING "btree" ("tracking_number");



CREATE INDEX "idx_shipping_addresses_user_id" ON "public"."shipping_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_support_ticket_messages_sender_id" ON "public"."support_ticket_messages" USING "btree" ("sender_id");



CREATE INDEX "idx_support_ticket_messages_ticket_id" ON "public"."support_ticket_messages" USING "btree" ("ticket_id");



CREATE INDEX "idx_support_tickets_assigned_to" ON "public"."support_tickets" USING "btree" ("assigned_to");



CREATE INDEX "idx_support_tickets_user_id" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_roles_granted_by" ON "public"."user_roles" USING "btree" ("granted_by");



CREATE INDEX "idx_user_roles_revoked_by" ON "public"."user_roles" USING "btree" ("revoked_by");



CREATE INDEX "idx_wishlist_product_id" ON "public"."wishlist" USING "btree" ("product_id");



CREATE INDEX "idx_wishlist_user_created" ON "public"."wishlist" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_wishlist_user_product" ON "public"."wishlist" USING "btree" ("user_id", "product_id");



CREATE OR REPLACE TRIGGER "admin_audit_trigger" AFTER INSERT OR UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_action"();



CREATE OR REPLACE TRIGGER "anonymize_contact_data" BEFORE INSERT ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."hash_ip_address"();



CREATE OR REPLACE TRIGGER "audit_role_changes_trigger" AFTER INSERT OR UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_role_changes"();



CREATE OR REPLACE TRIGGER "blog_post_translations_updated_at" BEFORE UPDATE ON "public"."blog_post_translations" FOR EACH ROW EXECUTE FUNCTION "public"."update_translation_updated_at"();



CREATE OR REPLACE TRIGGER "detect_payment_fraud_trigger" AFTER INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."detect_payment_fraud"();



CREATE OR REPLACE TRIGGER "detect_security_breach_trigger" AFTER INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."detect_security_breach"();



CREATE OR REPLACE TRIGGER "detect_suspicious_activity" AFTER INSERT OR UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."detect_suspicious_login"();



CREATE OR REPLACE TRIGGER "enhanced_audit_admin_users" AFTER INSERT OR DELETE OR UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."enhanced_audit_logger"();



CREATE OR REPLACE TRIGGER "enhanced_audit_payments" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."enhanced_audit_logger"();



CREATE OR REPLACE TRIGGER "enhanced_audit_shipping_addresses" AFTER INSERT OR DELETE OR UPDATE ON "public"."shipping_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."enhanced_audit_logger"();



CREATE OR REPLACE TRIGGER "enhanced_newsletter_scraping_detection" AFTER INSERT OR UPDATE ON "public"."newsletter_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."detect_newsletter_scraping_enhanced"();



CREATE OR REPLACE TRIGGER "monitor_admin_users_trigger" AFTER INSERT OR UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."monitor_admin_users_access"();



CREATE OR REPLACE TRIGGER "product_translations_updated_at" BEFORE UPDATE ON "public"."product_translations" FOR EACH ROW EXECUTE FUNCTION "public"."update_translation_updated_at"();



CREATE OR REPLACE TRIGGER "sanitize_product_html_trigger" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sanitize_product_html"();



CREATE OR REPLACE TRIGGER "trg_sync_order_status" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_status"();



CREATE OR REPLACE TRIGGER "trg_sync_product_availability" BEFORE INSERT OR UPDATE OF "stock_quantity" ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."sync_product_availability"();



CREATE OR REPLACE TRIGGER "trigger_auto_log_order_status" AFTER UPDATE ON "public"."orders" FOR EACH ROW WHEN (("old"."order_status" IS DISTINCT FROM "new"."order_status")) EXECUTE FUNCTION "public"."auto_log_order_status_change"();



CREATE OR REPLACE TRIGGER "trigger_notify_order_status_change" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."notify_order_status_change"();



CREATE OR REPLACE TRIGGER "trigger_security_alert_detection" AFTER INSERT ON "public"."security_events" FOR EACH ROW EXECUTE FUNCTION "public"."detect_and_alert_security_event"();



CREATE OR REPLACE TRIGGER "update_admin_order_permissions_updated_at" BEFORE UPDATE ON "public"."admin_order_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_admin_users_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_artisans_updated_at" BEFORE UPDATE ON "public"."artisans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_blog_posts_updated_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_checkout_sessions_updated_at" BEFORE UPDATE ON "public"."checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_discount_coupons_updated_at" BEFORE UPDATE ON "public"."discount_coupons" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_ab_tests_updated_at" BEFORE UPDATE ON "public"."email_ab_tests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_error_reports_updated_at" BEFORE UPDATE ON "public"."support_tickets_error_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_error_report_updated_at"();



CREATE OR REPLACE TRIGGER "update_hero_images_updated_at" BEFORE UPDATE ON "public"."hero_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_loyalty_points_updated_at" BEFORE UPDATE ON "public"."loyalty_points" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_loyalty_rewards_updated_at" BEFORE UPDATE ON "public"."loyalty_rewards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_newsletter_subscriptions_updated_at" BEFORE UPDATE ON "public"."newsletter_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_order_anomalies_updated_at" BEFORE UPDATE ON "public"."order_anomalies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_reviews_updated_at" BEFORE UPDATE ON "public"."product_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_scheduled_emails_updated_at" BEFORE UPDATE ON "public"."scheduled_emails" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shipments_updated_at" BEFORE UPDATE ON "public"."shipments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shipping_addresses_updated_at" BEFORE UPDATE ON "public"."shipping_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shipping_zones_updated_at" BEFORE UPDATE ON "public"."shipping_zones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tag_translations_updated_at" BEFORE UPDATE ON "public"."tag_translations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_audit_log_trigger" BEFORE INSERT ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "public"."validate_audit_log_entry"();



ALTER TABLE ONLY "public"."admin_order_permissions"
    ADD CONSTRAINT "admin_order_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_order_permissions"
    ADD CONSTRAINT "admin_order_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."artisan_translations"
    ADD CONSTRAINT "artisan_translations_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "public"."artisans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."back_in_stock_notifications"
    ADD CONSTRAINT "back_in_stock_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_translations"
    ADD CONSTRAINT "blog_post_translations_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "fk_admin_users_profile" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "fk_blog_posts_author" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "fk_cart_items_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "fk_categories_parent" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."discount_coupons"
    ADD CONSTRAINT "fk_discount_coupons_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "fk_email_logs_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets_error_reports"
    ADD CONSTRAINT "fk_error_reports_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hero_images"
    ADD CONSTRAINT "fk_hero_images_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "fk_loyalty_points_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "fk_loyalty_redemptions_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "fk_loyalty_redemptions_reward" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "fk_loyalty_redemptions_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "fk_loyalty_transactions_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "fk_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "fk_orders_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "fk_payments_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_analytics"
    ADD CONSTRAINT "fk_product_analytics_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "fk_product_categories_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "fk_product_categories_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "fk_product_reviews_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_reviews"
    ADD CONSTRAINT "fk_product_reviews_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_config"
    ADD CONSTRAINT "fk_security_config_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "fk_shipments_order" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shipping_addresses"
    ADD CONSTRAINT "fk_shipping_addresses_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "fk_support_tickets_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "fk_user_roles_granted_by" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "fk_user_roles_profile" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "fk_wishlist_product" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "fk_wishlist_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fraud_assessments"
    ADD CONSTRAINT "fraud_assessments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fraud_assessments"
    ADD CONSTRAINT "fraud_assessments_override_by_fkey" FOREIGN KEY ("override_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_points"
    ADD CONSTRAINT "loyalty_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "loyalty_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_redemptions"
    ADD CONSTRAINT "loyalty_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_anomalies"
    ADD CONSTRAINT "order_anomalies_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_anomalies"
    ADD CONSTRAINT "order_anomalies_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_anomalies"
    ADD CONSTRAINT "order_anomalies_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_checkout_session_id_fkey" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_events"
    ADD CONSTRAINT "payment_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_analytics"
    ADD CONSTRAINT "product_analytics_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_analytics"
    ADD CONSTRAINT "product_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_translations"
    ADD CONSTRAINT "product_translations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_artisan_id_fkey" FOREIGN KEY ("artisan_id") REFERENCES "public"."artisans"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_events"
    ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_ticket_messages"
    ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets_error_reports"
    ADD CONSTRAINT "support_tickets_error_reports_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets_error_reports"
    ADD CONSTRAINT "support_tickets_error_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlist"
    ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete tag translations" ON "public"."tag_translations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Admins can insert fraud assessments" ON "public"."fraud_assessments" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can insert payment events" ON "public"."payment_events" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can insert tag translations" ON "public"."tag_translations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Admins can manage A/B tests" ON "public"."email_ab_tests" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can manage AB tests" ON "public"."ab_theme_tests" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage fraud rules" ON "public"."fraud_rules" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can manage order anomalies" ON "public"."order_anomalies" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can read payment events" ON "public"."payment_events" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can update tag translations" ON "public"."tag_translations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users"
  WHERE ("admin_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Admins can view fraud assessments" ON "public"."fraud_assessments" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Admins can view product analytics" ON "public"."product_analytics" FOR SELECT USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Anyone can read active AB tests" ON "public"."ab_theme_tests" FOR SELECT USING (true);



CREATE POLICY "Anyone can read customer mapping" ON "public"."order_status_customer_mapping" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can read state transitions" ON "public"."order_state_transitions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Anyone can read tag translations" ON "public"."tag_translations" FOR SELECT USING (true);



CREATE POLICY "Deny all audit log deletions" ON "public"."audit_logs" FOR DELETE USING (false);



CREATE POLICY "Deny all audit log updates" ON "public"."audit_logs" FOR UPDATE USING (false);



CREATE POLICY "Internal only access" ON "public"."notification_settings" USING (false);



CREATE POLICY "No deletes on payment events" ON "public"."payment_events" FOR DELETE USING (false);



CREATE POLICY "No updates on payment events" ON "public"."payment_events" FOR UPDATE USING (false);



CREATE POLICY "Only admins can update payments" ON "public"."payments" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "Prevent payment deletion" ON "public"."payments" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "Prevent role deletion" ON "public"."user_roles" FOR DELETE USING (false);



CREATE POLICY "Super admins can grant roles" ON "public"."user_roles" FOR INSERT WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can manage security config" ON "public"."security_config" USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "Super admins can revoke roles" ON "public"."user_roles" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "Users can add to their own wishlist" ON "public"."wishlist" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own cart items" ON "public"."cart_items" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own cart items" ON "public"."cart_items" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own order items" ON "public"."order_items" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can insert their own orders" ON "public"."orders" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can remove from their own wishlist" ON "public"."wishlist" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own cart items" ON "public"."cart_items" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own cart items" ON "public"."cart_items" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own wishlist" ON "public"."wishlist" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."ab_theme_tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_only_rate_limits_select" ON "public"."rate_limits" FOR SELECT USING (("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



ALTER TABLE "public"."admin_order_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_select_super_admin_only" ON "public"."admin_users" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "aop_delete" ON "public"."admin_order_permissions" FOR DELETE TO "authenticated" USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "aop_insert" ON "public"."admin_order_permissions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "aop_select" ON "public"."admin_order_permissions" FOR SELECT TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "aop_update" ON "public"."admin_order_permissions" FOR UPDATE TO "authenticated" USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_settings_admin_delete" ON "public"."app_settings" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "app_settings_admin_insert" ON "public"."app_settings" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "app_settings_admin_update" ON "public"."app_settings" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "app_settings_select_admin_only" ON "public"."app_settings" FOR SELECT TO "authenticated" USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."artisan_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."artisans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "artisans_delete" ON "public"."artisans" FOR DELETE TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "artisans_insert" ON "public"."artisans" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "artisans_select" ON "public"."artisans" FOR SELECT TO "authenticated", "anon" USING ((("is_active" = true) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "artisans_update" ON "public"."artisans" FOR UPDATE TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "at_delete" ON "public"."artisan_translations" FOR DELETE TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "at_insert" ON "public"."artisan_translations" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "at_select" ON "public"."artisan_translations" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "at_update" ON "public"."artisan_translations" FOR UPDATE TO "authenticated" USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_insert_audit_logs" ON "public"."audit_logs" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_email_logs" ON "public"."email_logs" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_security_alerts" ON "public"."security_alerts" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_insert_security_events" ON "public"."security_events" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "authenticated_users_can_delete_own_notifications" ON "public"."notification_preferences" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_delete_own_preferences" ON "public"."user_preferences" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_insert_own_notifications" ON "public"."notification_preferences" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_insert_own_preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_update_own_notifications" ON "public"."notification_preferences" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_update_own_preferences" ON "public"."user_preferences" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "authenticated_users_can_view_own_notifications" ON "public"."notification_preferences" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."back_in_stock_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bisn_delete" ON "public"."back_in_stock_notifications" FOR DELETE USING ((("email" = "public"."get_auth_user_email"()) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "bisn_insert" ON "public"."back_in_stock_notifications" FOR INSERT WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")));



CREATE POLICY "bisn_select" ON "public"."back_in_stock_notifications" FOR SELECT USING ((("email" = "public"."get_auth_user_email"()) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "bisn_update" ON "public"."back_in_stock_notifications" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "block_anonymous_access" ON "public"."contact_messages" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "block_anonymous_audit_logs" ON "public"."audit_logs" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "block_anonymous_email_logs" ON "public"."email_logs" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "block_anonymous_error_reports" ON "public"."support_tickets_error_reports" AS RESTRICTIVE FOR SELECT TO "anon" USING (false);



CREATE POLICY "block_anonymous_security_alerts" ON "public"."security_alerts" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "block_anonymous_security_events" ON "public"."security_events" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "block_anonymous_support_access" ON "public"."support_tickets" AS RESTRICTIVE TO "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."blog_post_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blog_post_translations_admin_delete" ON "public"."blog_post_translations" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "blog_post_translations_admin_insert" ON "public"."blog_post_translations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."blog_posts" "bp"
  WHERE (("bp"."id" = "blog_post_translations"."blog_post_id") AND (("bp"."author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "blog_post_translations_admin_update" ON "public"."blog_post_translations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."blog_posts" "bp"
  WHERE (("bp"."id" = "blog_post_translations"."blog_post_id") AND (("bp"."author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "blog_post_translations_select" ON "public"."blog_post_translations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."blog_posts" "bp"
  WHERE (("bp"."id" = "blog_post_translations"."blog_post_id") AND (("bp"."status" = 'published'::"text") OR ("bp"."author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blog_posts_delete_policy" ON "public"."blog_posts" FOR DELETE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "blog_posts_insert_policy" ON "public"."blog_posts" FOR INSERT WITH CHECK ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "blog_posts_select_policy" ON "public"."blog_posts" FOR SELECT USING ((("status" = 'published'::"text") OR ("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "blog_posts_update_policy" ON "public"."blog_posts" FOR UPDATE USING ((("author_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_admin_delete" ON "public"."categories" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "categories_admin_insert" ON "public"."categories" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "categories_admin_update" ON "public"."categories" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."checkout_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "checkout_sessions_insert" ON "public"."checkout_sessions" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())) AND (("auth"."uid"() IS NOT NULL) OR ("public"."get_request_guest_id"() IS NOT NULL))));



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cs_insert" ON "public"."checkout_sessions" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("guest_id" IS NOT NULL) AND ("guest_id" = "public"."get_request_guest_id"()))));



CREATE POLICY "cs_select" ON "public"."checkout_sessions" FOR SELECT TO "authenticated", "anon" USING (("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("guest_id" IS NOT NULL) AND ("guest_id" = "public"."get_request_guest_id"()) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND ("status" <> ALL (ARRAY['completed'::"text", 'abandoned'::"text"])))));



CREATE POLICY "cs_update" ON "public"."checkout_sessions" FOR UPDATE TO "authenticated", "anon" USING (("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("guest_id" IS NOT NULL) AND ("guest_id" = "public"."get_request_guest_id"()) AND (("expires_at" IS NULL) OR ("expires_at" > "now"())) AND ("status" <> ALL (ARRAY['completed'::"text", 'abandoned'::"text"]))))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (("guest_id" IS NOT NULL) AND ("guest_id" = "public"."get_request_guest_id"())) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "deny_admin_delete" ON "public"."admin_users" FOR DELETE USING (false);



CREATE POLICY "deny_all_invoices" ON "public"."invoices" TO "authenticated", "anon" USING (false) WITH CHECK (false);



CREATE POLICY "deny_anonymous_admin_access" ON "public"."admin_users" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_cart_access" ON "public"."cart_items" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_error_reports_access" ON "public"."support_tickets_error_reports" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_loyalty_points_access" ON "public"."loyalty_points" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_loyalty_redemptions_access" ON "public"."loyalty_redemptions" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_loyalty_transactions_access" ON "public"."loyalty_transactions" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_notification_prefs_access" ON "public"."notification_preferences" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_order_items_delete" ON "public"."order_items" FOR DELETE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_order_items_insert" ON "public"."order_items" FOR INSERT TO "anon" WITH CHECK (false);



CREATE POLICY "deny_anonymous_order_items_update" ON "public"."order_items" FOR UPDATE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_orders_delete" ON "public"."orders" FOR DELETE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_orders_insert" ON "public"."orders" FOR INSERT TO "anon" WITH CHECK (false);



CREATE POLICY "deny_anonymous_orders_update" ON "public"."orders" FOR UPDATE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_profile_access" ON "public"."profiles" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_shipping_access" ON "public"."shipping_addresses" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_ticket_messages_access" ON "public"."support_ticket_messages" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_user_preferences_access" ON "public"."user_preferences" AS RESTRICTIVE TO "anon" USING (false);



CREATE POLICY "deny_anonymous_wishlist_access" ON "public"."wishlist" AS RESTRICTIVE TO "anon" USING (false);



ALTER TABLE "public"."discount_coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "discount_coupons_admin_delete" ON "public"."discount_coupons" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "discount_coupons_admin_insert" ON "public"."discount_coupons" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "discount_coupons_admin_update" ON "public"."discount_coupons" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "discount_coupons_select_admin_only" ON "public"."discount_coupons" FOR SELECT TO "authenticated", "anon" USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."edge_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_ab_tests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "error_reports_delete" ON "public"."support_tickets_error_reports" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "error_reports_insert" ON "public"."support_tickets_error_reports" FOR INSERT WITH CHECK ((("description" IS NOT NULL) AND "public"."check_rate_limit"(COALESCE((( SELECT "auth"."uid"() AS "uid"))::"text", ("inet_client_addr"())::"text", 'unknown'::"text"), 'error_report'::"text", 10, 60)));



CREATE POLICY "error_reports_select" ON "public"."support_tickets_error_reports" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "error_reports_update" ON "public"."support_tickets_error_reports" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."fraud_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fraud_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hero_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hero_images_admin_delete" ON "public"."hero_images" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "hero_images_admin_insert" ON "public"."hero_images" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "hero_images_admin_update" ON "public"."hero_images" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "hero_images_select" ON "public"."hero_images" FOR SELECT USING ((("is_active" = true) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_points_admin_delete" ON "public"."loyalty_points" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_points_admin_insert" ON "public"."loyalty_points" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_points_admin_update" ON "public"."loyalty_points" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_points_select" ON "public"."loyalty_points" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."loyalty_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_redemptions_admin_delete" ON "public"."loyalty_redemptions" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_redemptions_admin_modify" ON "public"."loyalty_redemptions" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_redemptions_insert_policy" ON "public"."loyalty_redemptions" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "loyalty_redemptions_select_policy" ON "public"."loyalty_redemptions" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."loyalty_rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_rewards_admin_delete" ON "public"."loyalty_rewards" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_rewards_admin_insert" ON "public"."loyalty_rewards" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_rewards_admin_update" ON "public"."loyalty_rewards" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_rewards_select" ON "public"."loyalty_rewards" FOR SELECT USING (true);



ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_transactions_admin_delete" ON "public"."loyalty_transactions" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_transactions_admin_update" ON "public"."loyalty_transactions" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "loyalty_transactions_select" ON "public"."loyalty_transactions" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "lt_insert_admin_only" ON "public"."loyalty_transactions" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "newsletter_delete_policy" ON "public"."newsletter_subscriptions" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "newsletter_insert_policy" ON "public"."newsletter_subscriptions" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")));



CREATE POLICY "newsletter_select_strict_v2" ON "public"."newsletter_subscriptions" FOR SELECT USING ((("email" = "public"."get_auth_user_email"()) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



ALTER TABLE "public"."newsletter_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "newsletter_update" ON "public"."newsletter_subscriptions" FOR UPDATE USING (("public"."user_owns_newsletter_subscription"("email") OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")))) WITH CHECK ((("email" IS NOT NULL) AND ("email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_anomalies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT TO "authenticated", "anon" USING (((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND ("orders"."user_id" IS NULL) AND (("orders"."metadata" ->> 'guest_id'::"text") IS NOT NULL) AND (("orders"."metadata" ->> 'guest_id'::"text") = "public"."get_request_guest_id"()))))));



ALTER TABLE "public"."order_state_transitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_customer_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_select" ON "public"."orders" FOR SELECT TO "authenticated", "anon" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role") OR (("user_id" IS NULL) AND (("metadata" ->> 'guest_id'::"text") IS NOT NULL) AND (("metadata" ->> 'guest_id'::"text") = "public"."get_request_guest_id"()))));



CREATE POLICY "orders_update_admin_only" ON "public"."orders" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "osh_select" ON "public"."order_status_history" FOR SELECT TO "authenticated" USING (("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_history"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "pa_insert_anon" ON "public"."product_analytics" FOR INSERT TO "anon" WITH CHECK ((("session_id" IS NOT NULL) AND ("event_type" IS NOT NULL) AND ("event_type" = ANY (ARRAY['view'::"text", 'click'::"text", 'add_to_cart'::"text", 'purchase'::"text", 'wishlist_add'::"text", 'share'::"text"])) AND ( SELECT ("count"(*) < 20)
   FROM "public"."product_analytics" "pa"
  WHERE (("pa"."session_id" = "product_analytics"."session_id") AND ("pa"."created_at" > ("now"() - '00:01:00'::interval))))));



CREATE POLICY "pa_insert_auth" ON "public"."product_analytics" FOR INSERT TO "authenticated" WITH CHECK ((("event_type" IS NOT NULL) AND ("event_type" = ANY (ARRAY['view'::"text", 'click'::"text", 'add_to_cart'::"text", 'purchase'::"text", 'wishlist_add'::"text", 'share'::"text"])) AND ( SELECT ("count"(*) < 100)
   FROM "public"."product_analytics" "pa"
  WHERE (("pa"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("pa"."created_at" > ("now"() - '00:01:00'::interval))))));



ALTER TABLE "public"."payment_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_select" ON "public"."payments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "payments"."order_id") AND ("o"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



CREATE POLICY "prevent_alert_deletion" ON "public"."security_alerts" FOR DELETE USING (false);



CREATE POLICY "prevent_profile_deletion" ON "public"."profiles" FOR DELETE USING (false);



ALTER TABLE "public"."product_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_categories_admin_delete" ON "public"."product_categories" FOR DELETE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_categories_admin_insert" ON "public"."product_categories" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_categories_admin_update" ON "public"."product_categories" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_categories_select" ON "public"."product_categories" FOR SELECT USING (true);



ALTER TABLE "public"."product_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_reviews_delete" ON "public"."product_reviews" FOR DELETE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_reviews_insert" ON "public"."product_reviews" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "product_reviews_select" ON "public"."product_reviews" FOR SELECT USING ((("is_approved" = true) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "product_reviews_update" ON "public"."product_reviews" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."product_translations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_translations_admin_delete" ON "public"."product_translations" FOR DELETE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_translations_admin_insert" ON "public"."product_translations" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_translations_admin_update" ON "public"."product_translations" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "product_translations_select" ON "public"."product_translations" FOR SELECT USING (true);



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_admin_delete" ON "public"."products" FOR DELETE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "products_admin_insert" ON "public"."products" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "products_admin_update" ON "public"."products" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_strict" ON "public"."profiles" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



CREATE POLICY "rate_limited_public_insert" ON "public"."contact_messages" FOR INSERT TO "authenticated", "anon" WITH CHECK ("public"."check_rate_limit"(COALESCE(("inet_client_addr"())::"text", 'unknown'::"text"), 'contact_submission'::"text", 3, 60));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limits_admin_delete" ON "public"."rate_limits" FOR DELETE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "rate_limits_admin_insert" ON "public"."rate_limits" FOR INSERT WITH CHECK ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "rate_limits_admin_update" ON "public"."rate_limits" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."scheduled_emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_emails_delete" ON "public"."scheduled_emails" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "scheduled_emails_insert" ON "public"."scheduled_emails" FOR INSERT WITH CHECK (("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid")) AND ("recipient_email" IS NOT NULL) AND ("template_name" IS NOT NULL) AND ("scheduled_for" IS NOT NULL)));



CREATE POLICY "scheduled_emails_select" ON "public"."scheduled_emails" FOR SELECT USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "scheduled_emails_update" ON "public"."scheduled_emails" FOR UPDATE USING ("public"."is_admin_user"(( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ((("recipient_email" IS NOT NULL) AND ("template_name" IS NOT NULL)));



ALTER TABLE "public"."security_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipments_admin_delete" ON "public"."shipments" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipments_admin_insert" ON "public"."shipments" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipments_admin_update" ON "public"."shipments" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipments_select" ON "public"."shipments" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "shipments"."order_id") AND ("orders"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."shipping_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipping_addresses_select_strict" ON "public"."shipping_addresses" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'admin'::"public"."app_role") OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



ALTER TABLE "public"."shipping_zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shipping_zones_admin_delete" ON "public"."shipping_zones" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipping_zones_admin_insert" ON "public"."shipping_zones" FOR INSERT WITH CHECK ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipping_zones_admin_update" ON "public"."shipping_zones" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "shipping_zones_select" ON "public"."shipping_zones" FOR SELECT USING (true);



CREATE POLICY "strict_shipping_delete" ON "public"."shipping_addresses" FOR DELETE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "strict_shipping_insert" ON "public"."shipping_addresses" FOR INSERT WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "strict_shipping_update" ON "public"."shipping_addresses" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (( SELECT "auth"."uid"() AS "uid") = "user_id"))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND (( SELECT "auth"."uid"() AS "uid") = "user_id")));



CREATE POLICY "super_admin_delete_only" ON "public"."contact_messages" FOR DELETE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_only_insert" ON "public"."admin_users" FOR INSERT WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_only_update" ON "public"."admin_users" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_select_audit_logs" ON "public"."audit_logs" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_select_email_logs" ON "public"."email_logs" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_select_only" ON "public"."contact_messages" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_select_security_alerts" ON "public"."security_alerts" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_select_security_events" ON "public"."security_events" FOR SELECT USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_update_email_logs" ON "public"."email_logs" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_update_only" ON "public"."contact_messages" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_update_security_alerts" ON "public"."security_alerts" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



CREATE POLICY "super_admin_update_security_events" ON "public"."security_events" FOR UPDATE USING ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")) WITH CHECK ("public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role"));



ALTER TABLE "public"."support_ticket_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_ticket_messages_delete" ON "public"."support_ticket_messages" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "support_ticket_messages_insert" ON "public"."support_ticket_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "support_ticket_messages"."ticket_id") AND "public"."can_access_support_ticket"("support_tickets"."id")))) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "support_ticket_messages_select" ON "public"."support_ticket_messages" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."support_tickets"
  WHERE (("support_tickets"."id" = "support_ticket_messages"."ticket_id") AND "public"."can_access_support_ticket"("support_tickets"."id")))) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "support_ticket_messages_update" ON "public"."support_ticket_messages" FOR UPDATE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_delete_policy" ON "public"."support_tickets" FOR DELETE USING ("public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."support_tickets_error_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_insert_policy" ON "public"."support_tickets" FOR INSERT WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "support_tickets_select_policy" ON "public"."support_tickets" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "support_tickets_update_policy" ON "public"."support_tickets" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_user_admin"(( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."tag_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_preferences_select_policy" ON "public"."user_preferences" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select_policy" ON "public"."user_roles" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."has_role"(( SELECT "auth"."uid"() AS "uid"), 'super_admin'::"public"."app_role")));



CREATE POLICY "users_can_insert_own_profile" ON "public"."profiles" FOR INSERT WITH CHECK (("public"."is_authenticated_user"() AND (( SELECT "auth"."uid"() AS "uid") = "id")));



CREATE POLICY "users_can_update_own_profile" ON "public"."profiles" FOR UPDATE USING (("public"."is_authenticated_user"() AND (( SELECT "auth"."uid"() AS "uid") = "id"))) WITH CHECK (("public"."is_authenticated_user"() AND (( SELECT "auth"."uid"() AS "uid") = "id")));



ALTER TABLE "public"."wishlist" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."orders";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































































































































































































































REVOKE ALL ON FUNCTION "public"."add_admin_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_is_super_admin" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_admin_user"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_is_super_admin" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_loyalty_points"("p_user_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_loyalty_points"("p_user_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_loyalty_points"("p_user_id" "uuid", "p_points" integer, "p_source_type" "text", "p_source_id" "text", "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_loyalty_points"("user_uuid" "uuid", "points" integer, "transaction_type" "text", "source_type" "text", "source_id" "text", "description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_loyalty_points"("user_uuid" "uuid", "points" integer, "transaction_type" "text", "source_type" "text", "source_id" "text", "description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."anonymize_sensitive_data"("input_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."anonymize_sensitive_data"("input_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."anonymize_sensitive_data"("input_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_old_payment_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."archive_old_payment_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_old_payment_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_checkout_session_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_checkout_session_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_checkout_session_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_role_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_role_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_role_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_log_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_log_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_log_order_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_fraud_score"("p_order_id" "uuid", "p_customer_email" "text", "p_shipping_address" "jsonb", "p_billing_address" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_checkout_duration_seconds" integer, "p_is_first_order" boolean, "p_order_amount" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_fraud_score"("p_order_id" "uuid", "p_customer_email" "text", "p_shipping_address" "jsonb", "p_billing_address" "jsonb", "p_ip_address" "text", "p_user_agent" "text", "p_checkout_duration_seconds" integer, "p_is_first_order" boolean, "p_order_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_support_ticket"("ticket_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_support_ticket"("ticket_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_support_ticket"("ticket_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_rate_limit"("p_identifier" "text", "p_action_type" "text", "p_max_attempts" integer, "p_window_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_stale_pending_orders"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_stale_pending_orders"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid", "p_payment_intent" "text", "p_amount" numeric, "p_currency" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_order_payment"("p_order_id" "uuid", "p_payment_intent" "text", "p_amount" numeric, "p_currency" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_guest_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_guest_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_guest_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_order_anomaly"("p_order_id" "uuid", "p_anomaly_type" "public"."order_anomaly_type", "p_severity" "public"."anomaly_severity", "p_title" "text", "p_description" "text", "p_detected_by" "public"."status_change_actor", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_anomaly"("p_order_id" "uuid", "p_anomaly_type" "public"."order_anomaly_type", "p_severity" "public"."anomaly_severity", "p_title" "text", "p_description" "text", "p_detected_by" "public"."status_change_actor", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_anomaly"("p_order_id" "uuid", "p_anomaly_type" "public"."order_anomaly_type", "p_severity" "public"."anomaly_severity", "p_title" "text", "p_description" "text", "p_detected_by" "public"."status_change_actor", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_and_alert_security_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_and_alert_security_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_and_alert_security_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping_enhanced"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping_enhanced"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_newsletter_scraping_enhanced"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_payment_fraud"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_payment_fraud"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_payment_fraud"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_security_breach"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_security_breach"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_security_breach"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_suspicious_login"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_suspicious_login"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_suspicious_login"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."edge_rate_limit_consume"("p_identifier" "text", "p_max_attempts" integer, "p_window_ms" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."emergency_lockdown_contact_data"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."emergency_lockdown_contact_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enhanced_audit_logger"() TO "anon";
GRANT ALL ON FUNCTION "public"."enhanced_audit_logger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enhanced_audit_logger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enhanced_log_contact_message_access"("message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enhanced_log_contact_message_access"("message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enhanced_log_contact_message_access"("message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_access_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_access_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_access_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_users_secure"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users_secure"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users_secure"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_users_with_audit"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users_with_audit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users_with_audit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contact_message_details"("message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_contact_message_details"("message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contact_message_details"("message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_contact_messages_secure"("p_limit" integer, "p_offset" integer, "p_include_pii" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_contact_messages_secure"("p_limit" integer, "p_offset" integer, "p_include_pii" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_contact_messages_secure"("p_limit" integer, "p_offset" integer, "p_include_pii" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_segments"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_segments"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_segments"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_masked_contact_messages"("limit_count" integer, "offset_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_masked_contact_messages"("limit_count" integer, "offset_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_masked_contact_messages"("limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_masked_error_report"("report_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_masked_error_report"("report_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_masked_error_report"("report_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_masked_payment_info"("payment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_masked_payment_info"("payment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_masked_payment_info"("payment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_newsletter_subscriptions_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_newsletter_subscriptions_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_newsletter_subscriptions_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_customer_view"("p_order_id" "uuid", "p_user_id" "uuid", "p_locale" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_customer_view"("p_order_id" "uuid", "p_user_id" "uuid", "p_locale" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_customer_view"("p_order_id" "uuid", "p_user_id" "uuid", "p_locale" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_security_alerts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_profile_completion_percentage"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_profile_completion_percentage"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_profile_completion_percentage"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_request_guest_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_request_guest_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_request_guest_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_security_setting"("setting_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_security_setting"("setting_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_security_setting"("setting_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_emails_for_admin"("p_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_admin"("p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_admin"("p_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_newsletter_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_newsletter_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_newsletter_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."hash_ip_address"() TO "anon";
GRANT ALL ON FUNCTION "public"."hash_ip_address"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."hash_ip_address"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_ab_counter"("test_id" "uuid", "variant" "text", "counter_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ab_counter"("test_id" "uuid", "variant" "text", "counter_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ab_counter"("test_id" "uuid", "variant" "text", "counter_type" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_coupon_usage"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_coupon_usage"("p_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."init_loyalty_account"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."init_loyalty_account"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."init_loyalty_account"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_admin_user"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_authenticated_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_authenticated_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_authenticated_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_profile_owner"("profile_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_profile_owner"("profile_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_profile_owner"("profile_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_admin"("_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_admin"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_admin"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_user_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_user_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_user_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_contact_message_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_contact_message_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_contact_message_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_contact_message_access"("message_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_contact_message_access"("message_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_contact_message_access"("message_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_newsletter_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_newsletter_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_newsletter_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_profile_access"("accessed_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_profile_access"("accessed_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_profile_access"("accessed_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_security_event"("event_type" "text", "severity" "text", "details" "jsonb", "user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_security_event"("event_type" "text", "severity" "text", "details" "jsonb", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_description" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_description" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_activity_type" "text", "p_description" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_abandoned_checkout_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_abandoned_checkout_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_abandoned_checkout_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_alerts_notified"("alert_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_alerts_notified"("alert_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_email"("email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mask_email"("email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_email"("email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_phone"("phone_number" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("p_email" "text", "p_phone" "text", "p_full_mask" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("p_email" "text", "p_phone" "text", "p_full_mask" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mask_sensitive_data"("p_email" "text", "p_phone" "text", "p_full_mask" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."monitor_admin_users_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."monitor_admin_users_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."monitor_admin_users_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."monitor_audit_log_integrity"() TO "anon";
GRANT ALL ON FUNCTION "public"."monitor_audit_log_integrity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."monitor_audit_log_integrity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."monitor_contact_data_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."monitor_contact_data_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."monitor_contact_data_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_order_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_order_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_order_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."override_fraud_assessment"("p_order_id" "uuid", "p_action" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."override_fraud_assessment"("p_order_id" "uuid", "p_action" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."override_fraud_assessment"("p_order_id" "uuid", "p_action" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."payment_events_unacked_since"("p_since" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."payment_events_unacked_since"("p_since" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."payment_events_unacked_since"("p_since" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."payment_events_unacked_since"("p_since" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_order_anomaly"("p_anomaly_id" "uuid", "p_resolved_by" "uuid", "p_resolution_notes" "text", "p_resolution_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_order_anomaly"("p_anomaly_id" "uuid", "p_resolved_by" "uuid", "p_resolution_notes" "text", "p_resolution_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_order_anomaly"("p_anomaly_id" "uuid", "p_resolved_by" "uuid", "p_resolution_notes" "text", "p_resolution_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_contact_data_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."restore_contact_data_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_contact_data_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sanitize_product_html"() TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_product_html"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_product_html"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_cart"("p_user_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_cart"("p_user_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_cart"("p_user_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_order_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_product_availability"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_error_report_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_error_report_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_error_report_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_loyalty_tier"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_loyalty_tier"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_order_status"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_translation_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_translation_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_translation_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_owns_newsletter_subscription"("subscription_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_audit_log_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_audit_log_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_audit_log_entry"() TO "service_role";



GRANT ALL ON TABLE "public"."discount_coupons" TO "anon";
GRANT ALL ON TABLE "public"."discount_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."discount_coupons" TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_coupon_code"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_coupon_code"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_coupon_code"("p_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coupon_code"("p_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_guest_token"("_guest_id" "text", "_signature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_guest_token"("_guest_id" "text", "_signature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_guest_token"("_guest_id" "text", "_signature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_order_status_transition"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_order_status_transition"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_order_status_transition"("p_order_id" "uuid", "p_new_status" "public"."order_status", "p_actor" "public"."status_change_actor", "p_actor_user_id" "uuid", "p_reason_code" "text", "p_reason_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_admin_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_admin_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_admin_session"() TO "service_role";

































GRANT ALL ON TABLE "public"."ab_theme_tests" TO "anon";
GRANT ALL ON TABLE "public"."ab_theme_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."ab_theme_tests" TO "service_role";



GRANT ALL ON TABLE "public"."admin_order_permissions" TO "anon";
GRANT ALL ON TABLE "public"."admin_order_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_order_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."artisan_translations" TO "anon";
GRANT ALL ON TABLE "public"."artisan_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."artisan_translations" TO "service_role";



GRANT ALL ON TABLE "public"."artisans" TO "anon";
GRANT ALL ON TABLE "public"."artisans" TO "authenticated";
GRANT ALL ON TABLE "public"."artisans" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."back_in_stock_notifications" TO "anon";
GRANT ALL ON TABLE "public"."back_in_stock_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."back_in_stock_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."blog_post_translations" TO "anon";
GRANT ALL ON TABLE "public"."blog_post_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_post_translations" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages_masked" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages_masked" TO "service_role";



GRANT ALL ON TABLE "public"."edge_rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."edge_rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."edge_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."email_ab_tests" TO "anon";
GRANT ALL ON TABLE "public"."email_ab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."email_ab_tests" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs_masked" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs_masked" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_assessments" TO "anon";
GRANT ALL ON TABLE "public"."fraud_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_rules" TO "anon";
GRANT ALL ON TABLE "public"."fraud_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_rules" TO "service_role";



GRANT ALL ON TABLE "public"."hero_images" TO "anon";
GRANT ALL ON TABLE "public"."hero_images" TO "authenticated";
GRANT ALL ON TABLE "public"."hero_images" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_points" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_points" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_points" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_rewards" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."newsletter_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."order_anomalies" TO "anon";
GRANT ALL ON TABLE "public"."order_anomalies" TO "authenticated";
GRANT ALL ON TABLE "public"."order_anomalies" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_state_transitions" TO "anon";
GRANT ALL ON TABLE "public"."order_state_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."order_state_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_customer_mapping" TO "anon";
GRANT ALL ON TABLE "public"."order_status_customer_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_customer_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_events" TO "anon";
GRANT ALL ON TABLE "public"."payment_events" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_events" TO "service_role";



GRANT ALL ON TABLE "public"."payment_events_critical" TO "anon";
GRANT ALL ON TABLE "public"."payment_events_critical" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_events_critical" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."product_analytics" TO "anon";
GRANT ALL ON TABLE "public"."product_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."product_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_reviews" TO "anon";
GRANT ALL ON TABLE "public"."product_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."product_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."product_translations" TO "anon";
GRANT ALL ON TABLE "public"."product_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."product_translations" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_masked" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_masked" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_emails" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_emails" TO "service_role";



GRANT ALL ON TABLE "public"."security_alerts" TO "anon";
GRANT ALL ON TABLE "public"."security_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."security_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."security_config" TO "anon";
GRANT ALL ON TABLE "public"."security_config" TO "authenticated";
GRANT ALL ON TABLE "public"."security_config" TO "service_role";



GRANT ALL ON TABLE "public"."security_events" TO "anon";
GRANT ALL ON TABLE "public"."security_events" TO "authenticated";
GRANT ALL ON TABLE "public"."security_events" TO "service_role";



GRANT ALL ON TABLE "public"."shipments" TO "anon";
GRANT ALL ON TABLE "public"."shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."shipments" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_zones" TO "anon";
GRANT ALL ON TABLE "public"."shipping_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_zones" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets_error_reports" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets_error_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets_error_reports" TO "service_role";



GRANT ALL ON TABLE "public"."tag_translations" TO "anon";
GRANT ALL ON TABLE "public"."tag_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."tag_translations" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."wishlist" TO "anon";
GRANT ALL ON TABLE "public"."wishlist" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlist" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























drop policy "at_select" on "public"."artisan_translations";

drop policy "artisans_select" on "public"."artisans";

drop policy "checkout_sessions_insert" on "public"."checkout_sessions";

drop policy "cs_insert" on "public"."checkout_sessions";

drop policy "cs_select" on "public"."checkout_sessions";

drop policy "cs_update" on "public"."checkout_sessions";

drop policy "rate_limited_public_insert" on "public"."contact_messages";

drop policy "discount_coupons_select_admin_only" on "public"."discount_coupons";

drop policy "deny_all_invoices" on "public"."invoices";

drop policy "newsletter_insert_policy" on "public"."newsletter_subscriptions";

drop policy "order_items_select" on "public"."order_items";

drop policy "orders_select" on "public"."orders";


  create policy "at_select"
  on "public"."artisan_translations"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "artisans_select"
  on "public"."artisans"
  as permissive
  for select
  to anon, authenticated
using (((is_active = true) OR public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "checkout_sessions_insert"
  on "public"."checkout_sessions"
  as permissive
  for insert
  to anon, authenticated
with check ((((user_id IS NULL) OR (user_id = auth.uid())) AND ((auth.uid() IS NOT NULL) OR (public.get_request_guest_id() IS NOT NULL))));



  create policy "cs_insert"
  on "public"."checkout_sessions"
  as permissive
  for insert
  to anon, authenticated
with check (((user_id = ( SELECT auth.uid() AS uid)) OR ((guest_id IS NOT NULL) AND (guest_id = public.get_request_guest_id()))));



  create policy "cs_select"
  on "public"."checkout_sessions"
  as permissive
  for select
  to anon, authenticated
using ((public.is_admin_user(( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT auth.uid() AS uid)) OR ((guest_id IS NOT NULL) AND (guest_id = public.get_request_guest_id()) AND ((expires_at IS NULL) OR (expires_at > now())) AND (status <> ALL (ARRAY['completed'::text, 'abandoned'::text])))));



  create policy "cs_update"
  on "public"."checkout_sessions"
  as permissive
  for update
  to anon, authenticated
using ((public.is_admin_user(( SELECT auth.uid() AS uid)) OR (user_id = ( SELECT auth.uid() AS uid)) OR ((guest_id IS NOT NULL) AND (guest_id = public.get_request_guest_id()) AND ((expires_at IS NULL) OR (expires_at > now())) AND (status <> ALL (ARRAY['completed'::text, 'abandoned'::text])))))
with check (((user_id = ( SELECT auth.uid() AS uid)) OR ((guest_id IS NOT NULL) AND (guest_id = public.get_request_guest_id())) OR public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "rate_limited_public_insert"
  on "public"."contact_messages"
  as permissive
  for insert
  to anon, authenticated
with check (public.check_rate_limit(COALESCE((inet_client_addr())::text, 'unknown'::text), 'contact_submission'::text, 3, 60));



  create policy "discount_coupons_select_admin_only"
  on "public"."discount_coupons"
  as permissive
  for select
  to anon, authenticated
using (public.is_user_admin(( SELECT auth.uid() AS uid)));



  create policy "deny_all_invoices"
  on "public"."invoices"
  as permissive
  for all
  to anon, authenticated
using (false)
with check (false);



  create policy "newsletter_insert_policy"
  on "public"."newsletter_subscriptions"
  as permissive
  for insert
  to anon, authenticated

with check (
  (email IS NOT NULL)
  AND (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

  create policy "order_items_select"
  on "public"."order_items"
  as permissive
  for select
  to anon, authenticated
using (((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( SELECT auth.uid() AS uid))))) OR public.is_admin_user(( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id IS NULL) AND ((orders.metadata ->> 'guest_id'::text) IS NOT NULL) AND ((orders.metadata ->> 'guest_id'::text) = public.get_request_guest_id()))))));



  create policy "orders_select"
  on "public"."orders"
  as permissive
  for select
  to anon, authenticated
using (((user_id = ( SELECT auth.uid() AS uid)) OR public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) OR ((user_id IS NULL) AND ((metadata ->> 'guest_id'::text) IS NOT NULL) AND ((metadata ->> 'guest_id'::text) = public.get_request_guest_id()))));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "block_anon_realtime"
  on "realtime"."messages"
  as permissive
  for select
  to anon
using (false);



  create policy "users_read_own_realtime"
  on "realtime"."messages"
  as permissive
  for select
  to authenticated
using ((public.is_admin_user(( SELECT auth.uid() AS uid)) OR (realtime.topic() = concat('private:', (( SELECT auth.uid() AS uid))::text))));



  create policy "Admins can delete hero images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'hero-images'::text) AND public.is_admin_user(auth.uid())));



  create policy "Admins can delete product images"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'product-images'::text) AND (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid())))));



  create policy "Admins can update hero images"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'hero-images'::text) AND public.is_admin_user(auth.uid())));



  create policy "Admins can update product images"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'product-images'::text) AND (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid())))));



  create policy "Admins can upload hero images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'hero-images'::text) AND public.is_admin_user(auth.uid())));



  create policy "Admins can upload product images"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'product-images'::text) AND (EXISTS ( SELECT 1
   FROM public.admin_users
  WHERE (admin_users.user_id = auth.uid())))));



  create policy "Anonymous users can upload error screenshots"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'error-screenshots'::text) AND (auth.role() = 'anon'::text)));



  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Blog images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'blog-images'::text));



  create policy "Product images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-images'::text));



  create policy "Public can view hero images"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'hero-images'::text));



  create policy "Public can view review photos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'review-photos'::text));



  create policy "Users can delete own review photos"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload error screenshots"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'error-screenshots'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Users can upload own review photos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'review-photos'::text) AND (( SELECT auth.uid() AS uid) IS NOT NULL) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view own error screenshots"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'error-screenshots'::text) AND (((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) OR public.is_admin_user(( SELECT auth.uid() AS uid)))));



  create policy "blog_images_delete_admin_only"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'blog-images'::text) AND public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "blog_images_insert_admin_only"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'blog-images'::text) AND public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "blog_images_update_admin_only"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'blog-images'::text) AND public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "error_screenshots_select_admin_only"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'error-screenshots'::text) AND public.is_admin_user(( SELECT auth.uid() AS uid))));



  create policy "invoices_bucket_deny_all_delete"
  on "storage"."objects"
  as permissive
  for delete
  to anon, authenticated
using (((bucket_id = 'invoices'::text) AND false));



  create policy "invoices_bucket_deny_all_insert"
  on "storage"."objects"
  as permissive
  for insert
  to anon, authenticated
with check (((bucket_id = 'invoices'::text) AND false));



  create policy "invoices_bucket_deny_all_select"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using (((bucket_id = 'invoices'::text) AND false));



  create policy "invoices_bucket_deny_all_update"
  on "storage"."objects"
  as permissive
  for update
  to anon, authenticated
using (((bucket_id = 'invoices'::text) AND false));



