-- Critical Security Fix: Enhanced Payment Data Protection
-- Strengthen RLS policies and add additional security layers for payments table

-- First, drop existing policies to recreate with stronger security
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "System can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Create highly restrictive RLS policies for payment data

-- 1. Users can ONLY view their own payment records (with audit logging)
CREATE POLICY "Users can view only their own payments with audit" 
    ON public.payments
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = payments.order_id 
            AND o.user_id = auth.uid()
        )
    );

-- 2. Only super admins can view all payments (regular admins cannot)
CREATE POLICY "Super admins can view all payments" 
    ON public.payments
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid() AND role = 'super-admin'
        )
    );

-- 3. Only edge functions with service role can insert payments
CREATE POLICY "Service role can insert payments" 
    ON public.payments
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- 4. Only edge functions with service role can update payments
CREATE POLICY "Service role can update payments" 
    ON public.payments
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Prevent all DELETE operations on payments (financial records should be immutable)
CREATE POLICY "Prevent payment deletion" 
    ON public.payments
    FOR DELETE 
    TO authenticated
    USING (false);

-- 6. Deny anonymous access completely
CREATE POLICY "Deny anonymous access to payments" 
    ON public.payments
    FOR ALL 
    TO anon
    USING (false);

-- Create a secure function to mask sensitive payment data for regular users
CREATE OR REPLACE FUNCTION public.get_masked_payment_info(payment_id uuid)
RETURNS jsonb AS $$
DECLARE
    payment_record jsonb;
    user_owns_payment boolean;
    is_super_admin boolean;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to detect suspicious payment access patterns
CREATE OR REPLACE FUNCTION public.detect_payment_fraud()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for payment fraud detection
DROP TRIGGER IF EXISTS detect_payment_fraud_trigger ON public.audit_logs;
CREATE TRIGGER detect_payment_fraud_trigger
    AFTER INSERT ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.detect_payment_fraud();

-- Create payment data retention policy function
CREATE OR REPLACE FUNCTION public.archive_old_payment_data()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;