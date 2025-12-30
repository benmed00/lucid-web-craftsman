-- =====================================================
-- Security Alerts System
-- =====================================================

-- Create security_alerts table for tracking and notifying
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  source_ip INET,
  user_id UUID,
  user_email TEXT,
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view security alerts
CREATE POLICY "super_admin_view_security_alerts" ON public.security_alerts
FOR SELECT USING (has_role((SELECT auth.uid()), 'super_admin'));

-- Only super_admins can update (resolve) alerts
CREATE POLICY "super_admin_update_security_alerts" ON public.security_alerts
FOR UPDATE USING (has_role((SELECT auth.uid()), 'super_admin'));

-- System can insert alerts
CREATE POLICY "system_insert_security_alerts" ON public.security_alerts
FOR INSERT WITH CHECK (true);

-- No deletion allowed
CREATE POLICY "prevent_alert_deletion" ON public.security_alerts
FOR DELETE USING (false);

-- =====================================================
-- Enhanced security event detection function
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_and_alert_security_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Create trigger on security_events table
DROP TRIGGER IF EXISTS trigger_security_alert_detection ON public.security_events;
CREATE TRIGGER trigger_security_alert_detection
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.detect_and_alert_security_event();

-- =====================================================
-- Function to get unnotified critical alerts
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_pending_security_alerts()
RETURNS TABLE (
  id UUID,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  description TEXT,
  source_ip INET,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- =====================================================
-- Function to mark alerts as notified
-- =====================================================

CREATE OR REPLACE FUNCTION public.mark_alerts_notified(alert_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.security_alerts
  SET notified_at = now()
  WHERE id = ANY(alert_ids);
END;
$$;