-- =====================================================
-- FRAUD DETECTION SCORING SYSTEM
-- =====================================================

-- 1. CREATE FRAUD RULE CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('address', 'payment', 'behavior', 'velocity', 'device')),
  description TEXT,
  score_impact INTEGER NOT NULL DEFAULT 0, -- Points added to fraud score (0-100 scale)
  is_active BOOLEAN DEFAULT true,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default fraud detection rules
INSERT INTO public.fraud_rules (rule_name, rule_type, description, score_impact, parameters) VALUES
  -- Address rules
  ('shipping_billing_mismatch', 'address', 'Shipping and billing addresses are different', 15, '{}'),
  ('high_risk_country', 'address', 'Order from high-risk country', 25, '{"countries": ["NG", "GH", "PH", "ID"]}'),
  ('po_box_address', 'address', 'Shipping to PO Box', 10, '{}'),
  
  -- Payment rules
  ('card_country_mismatch', 'payment', 'Card country differs from billing country', 20, '{}'),
  ('prepaid_card', 'payment', 'Payment with prepaid card', 15, '{}'),
  ('multiple_cards_same_order', 'payment', 'Multiple card attempts on same order', 30, '{}'),
  
  -- Behavior rules
  ('first_time_customer', 'behavior', 'First order from this customer', 5, '{}'),
  ('high_value_first_order', 'behavior', 'First order above threshold', 20, '{"threshold": 500}'),
  ('rush_checkout', 'behavior', 'Checkout completed in under 30 seconds', 15, '{"min_seconds": 30}'),
  
  -- Velocity rules
  ('multiple_orders_same_ip', 'velocity', 'Multiple orders from same IP in 24h', 25, '{"max_orders": 3, "hours": 24}'),
  ('multiple_orders_same_email', 'velocity', 'Multiple orders with same email in 24h', 20, '{"max_orders": 2, "hours": 24}'),
  ('high_order_frequency', 'velocity', 'Customer ordering too frequently', 15, '{"max_orders": 5, "days": 7}'),
  
  -- Device rules
  ('vpn_detected', 'device', 'VPN or proxy detected', 10, '{}'),
  ('tor_exit_node', 'device', 'Connection from Tor exit node', 35, '{}'),
  ('suspicious_user_agent', 'device', 'Bot-like or missing user agent', 20, '{}')
ON CONFLICT (rule_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view/modify fraud rules
CREATE POLICY "Admins can manage fraud rules" ON public.fraud_rules
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 2. CREATE FRAUD ASSESSMENT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fraud_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  total_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  triggered_rules JSONB NOT NULL DEFAULT '[]', -- Array of {rule_name, score, details}
  assessment_data JSONB DEFAULT '{}', -- Raw data used for assessment
  auto_action TEXT CHECK (auto_action IN ('approve', 'hold', 'reject', 'manual_review')),
  manual_override BOOLEAN DEFAULT false,
  override_by UUID REFERENCES auth.users(id),
  override_reason TEXT,
  override_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_assessments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view fraud assessments
CREATE POLICY "Admins can view fraud assessments" ON public.fraud_assessments
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- Policy: Only system can insert (via edge function)
CREATE POLICY "System can insert fraud assessments" ON public.fraud_assessments
  FOR INSERT TO service_role
  WITH CHECK (true);

-- 3. CREATE FRAUD SCORING FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_fraud_score(
  p_order_id UUID,
  p_customer_email TEXT,
  p_shipping_address JSONB,
  p_billing_address JSONB,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_checkout_duration_seconds INTEGER DEFAULT NULL,
  p_is_first_order BOOLEAN DEFAULT false,
  p_order_amount DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 4. CREATE FUNCTION TO OVERRIDE FRAUD ASSESSMENT
-- =====================================================
CREATE OR REPLACE FUNCTION public.override_fraud_assessment(
  p_order_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_order_id ON public.fraud_assessments(order_id);
CREATE INDEX IF NOT EXISTS idx_fraud_assessments_risk_level ON public.fraud_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_active ON public.fraud_rules(is_active) WHERE is_active = true;