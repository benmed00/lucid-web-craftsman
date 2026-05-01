-- =====================================================
-- ORDER MANAGEMENT SYSTEM - PRODUCTION GRADE
-- =====================================================

-- 1. ORDER STATUS ENUM (State Machine States)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'created',           -- Cart validated, not paid
      'payment_pending',   -- Awaiting payment confirmation
      'payment_failed',    -- Payment attempt failed
      'paid',              -- Payment confirmed
      'validation_in_progress', -- Anti-fraud / stock check
      'validated',         -- Order validated, ready for fulfillment
      'preparing',         -- Order being prepared
      'shipped',           -- Handed to carrier
      'in_transit',        -- With carrier
      'delivered',         -- Successfully delivered
      'delivery_failed',   -- Delivery attempt failed
      'partially_delivered', -- Some items delivered
      'return_requested',  -- Customer requested return
      'returned',          -- Items returned
      'refunded',          -- Full refund processed
      'partially_refunded', -- Partial refund processed
      'cancelled',         -- Order cancelled
      'archived'           -- Order archived (old orders)
    );
  END IF;
END $$;

-- 2. ANOMALY TYPES AND SEVERITY ENUMS
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_anomaly_type') THEN
    CREATE TYPE public.order_anomaly_type AS ENUM (
      'payment',    -- Payment issues
      'stock',      -- Stock inconsistencies
      'delivery',   -- Delivery problems
      'fraud',      -- Fraud detection
      'technical',  -- System errors
      'customer',   -- Customer disputes
      'carrier'     -- Carrier issues
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anomaly_severity') THEN
    CREATE TYPE public.anomaly_severity AS ENUM (
      'low',
      'medium',
      'high',
      'critical'
    );
  END IF;
END $$;

-- 3. ACTOR TYPE ENUM (Who made the change)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_change_actor') THEN
    CREATE TYPE public.status_change_actor AS ENUM (
      'system',     -- Automated system action
      'admin',      -- Admin user action
      'customer',   -- Customer action
      'webhook',    -- External webhook (Stripe, carrier, etc.)
      'scheduler'   -- Scheduled job
    );
  END IF;
END $$;

-- 4. ADMIN ORDER PERMISSION LEVELS
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_order_permission') THEN
    CREATE TYPE public.admin_order_permission AS ENUM (
      'read_only',       -- Support agent - can only view
      'operations',      -- Operations manager - can update status
      'full_access'      -- Super admin - can override anything
    );
  END IF;
END $$;

-- 5. ENHANCE ORDERS TABLE
-- =====================================================
-- Add new columns to existing orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_status public.order_status DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS fraud_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS fraud_flags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS has_anomaly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS anomaly_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_attention BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attention_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Migrate existing status to new enum (if needed)
UPDATE public.orders SET order_status = 
  CASE 
    WHEN status = 'pending' THEN 'created'::public.order_status
    WHEN status = 'paid' THEN 'paid'::public.order_status
    WHEN status = 'processing' THEN 'preparing'::public.order_status
    WHEN status = 'shipped' THEN 'shipped'::public.order_status
    WHEN status = 'delivered' THEN 'delivered'::public.order_status
    WHEN status = 'cancelled' THEN 'cancelled'::public.order_status
    WHEN status = 'refunded' THEN 'refunded'::public.order_status
    ELSE 'created'::public.order_status
  END
WHERE order_status IS NULL OR order_status = 'created';

-- 6. ORDER STATUS HISTORY TABLE (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status public.order_status,
  new_status public.order_status NOT NULL,
  changed_by public.status_change_actor NOT NULL DEFAULT 'system',
  changed_by_user_id UUID REFERENCES auth.users(id),
  reason_code TEXT,
  reason_message TEXT,
  free_comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_new_status ON public.order_status_history(new_status);

-- 7. ORDER ANOMALIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  anomaly_type public.order_anomaly_type NOT NULL,
  severity public.anomaly_severity NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  detected_by public.status_change_actor NOT NULL DEFAULT 'system',
  auto_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  resolution_action TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalated_to UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for anomalies
CREATE INDEX IF NOT EXISTS idx_order_anomalies_order_id ON public.order_anomalies(order_id);
CREATE INDEX IF NOT EXISTS idx_order_anomalies_severity ON public.order_anomalies(severity) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_anomalies_unresolved ON public.order_anomalies(detected_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_anomalies_type ON public.order_anomalies(anomaly_type);

-- 8. ORDER STATE TRANSITIONS TABLE (Define valid transitions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status public.order_status NOT NULL,
  to_status public.order_status NOT NULL,
  requires_permission admin_order_permission DEFAULT 'operations',
  is_customer_allowed BOOLEAN DEFAULT false,
  requires_reason BOOLEAN DEFAULT false,
  auto_notify_customer BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_status, to_status)
);

-- 9. INSERT VALID STATE TRANSITIONS
-- =====================================================
INSERT INTO public.order_state_transitions (from_status, to_status, requires_permission, is_customer_allowed, requires_reason, auto_notify_customer, description)
VALUES
  -- From CREATED
  ('created', 'payment_pending', 'read_only', true, false, false, 'Customer initiates payment'),
  ('created', 'cancelled', 'read_only', true, false, true, 'Order cancelled before payment'),
  
  -- From PAYMENT_PENDING
  ('payment_pending', 'paid', 'read_only', false, false, true, 'Payment confirmed'),
  ('payment_pending', 'payment_failed', 'read_only', false, false, true, 'Payment failed'),
  ('payment_pending', 'cancelled', 'operations', true, false, true, 'Cancelled during payment'),
  
  -- From PAYMENT_FAILED
  ('payment_failed', 'payment_pending', 'read_only', true, false, false, 'Retry payment'),
  ('payment_failed', 'cancelled', 'operations', true, false, true, 'Cancelled after payment failure'),
  
  -- From PAID
  ('paid', 'validation_in_progress', 'read_only', false, false, false, 'Start validation'),
  ('paid', 'validated', 'operations', false, false, false, 'Skip validation'),
  ('paid', 'cancelled', 'full_access', false, true, true, 'Cancel paid order'),
  ('paid', 'refunded', 'full_access', false, true, true, 'Refund paid order'),
  
  -- From VALIDATION_IN_PROGRESS
  ('validation_in_progress', 'validated', 'read_only', false, false, false, 'Validation passed'),
  ('validation_in_progress', 'cancelled', 'full_access', false, true, true, 'Failed validation'),
  
  -- From VALIDATED
  ('validated', 'preparing', 'operations', false, false, true, 'Start preparation'),
  ('validated', 'cancelled', 'full_access', false, true, true, 'Cancel validated order'),
  
  -- From PREPARING
  ('preparing', 'shipped', 'operations', false, false, true, 'Order shipped'),
  ('preparing', 'cancelled', 'full_access', false, true, true, 'Cancel during preparation'),
  
  -- From SHIPPED
  ('shipped', 'in_transit', 'read_only', false, false, true, 'In carrier network'),
  ('shipped', 'delivered', 'operations', false, false, true, 'Direct delivery'),
  ('shipped', 'delivery_failed', 'operations', false, false, true, 'Delivery attempt failed'),
  
  -- From IN_TRANSIT
  ('in_transit', 'delivered', 'operations', false, false, true, 'Successfully delivered'),
  ('in_transit', 'delivery_failed', 'operations', false, false, true, 'Delivery failed'),
  ('in_transit', 'partially_delivered', 'operations', false, true, true, 'Partial delivery'),
  
  -- From DELIVERED
  ('delivered', 'return_requested', 'read_only', true, true, true, 'Customer requests return'),
  ('delivered', 'archived', 'operations', false, false, false, 'Archive old order'),
  
  -- From DELIVERY_FAILED
  ('delivery_failed', 'in_transit', 'operations', false, false, true, 'Retry delivery'),
  ('delivery_failed', 'cancelled', 'full_access', false, true, true, 'Cancel after delivery failure'),
  ('delivery_failed', 'refunded', 'full_access', false, true, true, 'Refund after delivery failure'),
  
  -- From PARTIALLY_DELIVERED
  ('partially_delivered', 'delivered', 'operations', false, true, true, 'Complete delivery'),
  ('partially_delivered', 'return_requested', 'read_only', true, true, true, 'Return partial'),
  ('partially_delivered', 'partially_refunded', 'full_access', false, true, true, 'Partial refund'),
  
  -- From RETURN_REQUESTED
  ('return_requested', 'returned', 'operations', false, false, true, 'Return received'),
  ('return_requested', 'delivered', 'operations', false, true, true, 'Return cancelled'),
  
  -- From RETURNED
  ('returned', 'refunded', 'full_access', false, false, true, 'Full refund for return'),
  ('returned', 'partially_refunded', 'full_access', false, true, true, 'Partial refund'),
  
  -- From CANCELLED
  ('cancelled', 'archived', 'operations', false, false, false, 'Archive cancelled'),
  
  -- From REFUNDED / PARTIALLY_REFUNDED
  ('refunded', 'archived', 'operations', false, false, false, 'Archive refunded'),
  ('partially_refunded', 'refunded', 'full_access', false, true, true, 'Complete refund'),
  ('partially_refunded', 'archived', 'operations', false, false, false, 'Archive partial refund')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 10. CUSTOMER STATUS MAPPING (What customers see)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.order_status_customer_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_status public.order_status NOT NULL UNIQUE,
  customer_status_key TEXT NOT NULL,
  customer_status_label_fr TEXT NOT NULL,
  customer_status_label_en TEXT NOT NULL,
  customer_description_fr TEXT,
  customer_description_en TEXT,
  show_to_customer BOOLEAN DEFAULT true,
  display_order INTEGER,
  icon_name TEXT,
  color_class TEXT
);

INSERT INTO public.order_status_customer_mapping 
  (internal_status, customer_status_key, customer_status_label_fr, customer_status_label_en, customer_description_fr, customer_description_en, show_to_customer, display_order, icon_name, color_class)
VALUES
  ('created', 'pending', 'En attente', 'Pending', 'Votre commande a été reçue', 'Your order has been received', true, 1, 'Clock', 'text-yellow-500'),
  ('payment_pending', 'pending', 'En attente de paiement', 'Payment Pending', 'Nous attendons la confirmation de votre paiement', 'Waiting for payment confirmation', true, 2, 'CreditCard', 'text-yellow-500'),
  ('payment_failed', 'payment_issue', 'Problème de paiement', 'Payment Issue', 'Un problème est survenu avec votre paiement', 'There was an issue with your payment', true, 2, 'AlertCircle', 'text-red-500'),
  ('paid', 'confirmed', 'Confirmée', 'Confirmed', 'Votre commande est confirmée', 'Your order is confirmed', true, 3, 'CheckCircle', 'text-green-500'),
  ('validation_in_progress', 'confirmed', 'En cours de confirmation', 'Being Confirmed', 'Votre commande est en cours de vérification', 'Your order is being verified', true, 3, 'Loader', 'text-blue-500'),
  ('validated', 'confirmed', 'Confirmée', 'Confirmed', 'Votre commande est confirmée et sera préparée sous peu', 'Your order is confirmed and will be prepared soon', true, 4, 'CheckCircle', 'text-green-500'),
  ('preparing', 'preparing', 'En préparation', 'Preparing', 'Nos artisans préparent votre commande avec soin', 'Our artisans are carefully preparing your order', true, 5, 'Package', 'text-blue-500'),
  ('shipped', 'shipped', 'Expédiée', 'Shipped', 'Votre commande a été expédiée', 'Your order has been shipped', true, 6, 'Truck', 'text-purple-500'),
  ('in_transit', 'in_transit', 'En cours de livraison', 'In Transit', 'Votre commande est en route vers vous', 'Your order is on its way', true, 7, 'Truck', 'text-purple-500'),
  ('delivered', 'delivered', 'Livrée', 'Delivered', 'Votre commande a été livrée avec succès', 'Your order has been delivered', true, 8, 'CheckCircle', 'text-green-600'),
  ('delivery_failed', 'delivery_issue', 'Problème de livraison', 'Delivery Issue', 'Un problème est survenu lors de la livraison. Notre équipe s''en occupe.', 'There was a delivery issue. Our team is handling it.', true, 7, 'AlertTriangle', 'text-orange-500'),
  ('partially_delivered', 'partial', 'Partiellement livrée', 'Partially Delivered', 'Une partie de votre commande a été livrée', 'Part of your order has been delivered', true, 7, 'Package', 'text-orange-500'),
  ('return_requested', 'return_pending', 'Retour en cours', 'Return Pending', 'Votre demande de retour est en cours de traitement', 'Your return request is being processed', true, 9, 'RotateCcw', 'text-blue-500'),
  ('returned', 'returned', 'Retournée', 'Returned', 'Votre retour a été reçu', 'Your return has been received', true, 10, 'RotateCcw', 'text-gray-500'),
  ('refunded', 'refunded', 'Remboursée', 'Refunded', 'Votre commande a été remboursée', 'Your order has been refunded', true, 11, 'RefreshCw', 'text-green-500'),
  ('partially_refunded', 'partial_refund', 'Partiellement remboursée', 'Partially Refunded', 'Un remboursement partiel a été effectué', 'A partial refund has been issued', true, 11, 'RefreshCw', 'text-green-500'),
  ('cancelled', 'cancelled', 'Annulée', 'Cancelled', 'Votre commande a été annulée', 'Your order has been cancelled', true, 12, 'XCircle', 'text-red-500'),
  ('archived', 'archived', 'Archivée', 'Archived', 'Cette commande a été archivée', 'This order has been archived', false, 99, 'Archive', 'text-gray-400')
ON CONFLICT (internal_status) DO UPDATE SET
  customer_status_label_fr = EXCLUDED.customer_status_label_fr,
  customer_status_label_en = EXCLUDED.customer_status_label_en,
  customer_description_fr = EXCLUDED.customer_description_fr,
  customer_description_en = EXCLUDED.customer_description_en;

-- 11. ADMIN ORDER PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_order_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.admin_order_permission NOT NULL DEFAULT 'read_only',
  can_override_transitions BOOLEAN DEFAULT false,
  can_force_status BOOLEAN DEFAULT false,
  can_resolve_anomalies BOOLEAN DEFAULT false,
  can_process_refunds BOOLEAN DEFAULT false,
  can_view_fraud_data BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 12. FUNCTIONS: VALIDATE ORDER STATUS TRANSITION
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_order_status_transition(
  p_order_id UUID,
  p_new_status public.order_status,
  p_actor public.status_change_actor DEFAULT 'system',
  p_actor_user_id UUID DEFAULT NULL,
  p_reason_code TEXT DEFAULT NULL,
  p_reason_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 13. FUNCTION: UPDATE ORDER STATUS (WITH VALIDATION)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status public.order_status,
  p_actor public.status_change_actor DEFAULT 'system',
  p_actor_user_id UUID DEFAULT NULL,
  p_reason_code TEXT DEFAULT NULL,
  p_reason_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 14. FUNCTION: CREATE ORDER ANOMALY
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_order_anomaly(
  p_order_id UUID,
  p_anomaly_type public.order_anomaly_type,
  p_severity public.anomaly_severity,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_detected_by public.status_change_actor DEFAULT 'system',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 15. FUNCTION: RESOLVE ORDER ANOMALY
-- =====================================================
CREATE OR REPLACE FUNCTION public.resolve_order_anomaly(
  p_anomaly_id UUID,
  p_resolved_by UUID,
  p_resolution_notes TEXT,
  p_resolution_action TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 16. FUNCTION: GET ORDER WITH CUSTOMER VIEW
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_order_customer_view(
  p_order_id UUID,
  p_user_id UUID,
  p_locale TEXT DEFAULT 'fr'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- 17. RLS POLICIES
-- =====================================================
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_customer_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_order_permissions ENABLE ROW LEVEL SECURITY;

-- Order Status History - Admins can read all, customers only their orders
CREATE POLICY "Admins can read all order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Customers can read own order history" ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o 
      WHERE o.id = order_status_history.order_id AND o.user_id = auth.uid()
    )
  );

-- Order Anomalies - Admins only
CREATE POLICY "Admins can manage order anomalies" ON public.order_anomalies
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- State Transitions - Read only for all authenticated
CREATE POLICY "Anyone can read state transitions" ON public.order_state_transitions
  FOR SELECT TO authenticated
  USING (true);

-- Customer Mapping - Read only for all
CREATE POLICY "Anyone can read customer mapping" ON public.order_status_customer_mapping
  FOR SELECT TO authenticated
  USING (true);

-- Admin Permissions - Only super admins can manage
CREATE POLICY "Super admins manage order permissions" ON public.admin_order_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can read order permissions" ON public.admin_order_permissions
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- 18. TRIGGER: AUTO-LOG STATUS CHANGES
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trigger_auto_log_order_status ON public.orders;
CREATE TRIGGER trigger_auto_log_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
  EXECUTE FUNCTION public.auto_log_order_status_change();

-- 19. UPDATE TIMESTAMP TRIGGERS
-- =====================================================
CREATE TRIGGER update_order_anomalies_updated_at
  BEFORE UPDATE ON public.order_anomalies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_order_permissions_updated_at
  BEFORE UPDATE ON public.admin_order_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();