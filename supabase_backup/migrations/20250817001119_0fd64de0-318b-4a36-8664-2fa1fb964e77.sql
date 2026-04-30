-- Enhanced User Profiles - Essential Features Only
-- Add missing columns and core functionality

-- 1. Add missing columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_marketing": true,
  "order_updates": true,
  "loyalty_updates": true,
  "security_alerts": true
}';

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON public.loyalty_points(tier);

-- 3. Update user_preferences table 
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Paris';

-- 4. Add security settings
INSERT INTO public.security_config (setting_name, setting_value, description)
VALUES 
  ('profile_update_monitoring', 'true', 'Monitor profile updates for suspicious activity'),
  ('loyalty_fraud_detection', 'true', 'Enable fraud detection for loyalty transactions')
ON CONFLICT (setting_name) DO NOTHING;

-- 5. Create function to get profile completion percentage
CREATE OR REPLACE FUNCTION public.get_profile_completion_percentage(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 6. Add notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  email_order_confirmation BOOLEAN DEFAULT TRUE,
  email_shipping_updates BOOLEAN DEFAULT TRUE,
  email_delivery_confirmation BOOLEAN DEFAULT TRUE,
  email_promotional BOOLEAN DEFAULT TRUE,
  email_loyalty_updates BOOLEAN DEFAULT TRUE,
  email_security_alerts BOOLEAN DEFAULT TRUE,
  sms_order_updates BOOLEAN DEFAULT FALSE,
  sms_delivery_updates BOOLEAN DEFAULT FALSE,
  push_order_updates BOOLEAN DEFAULT TRUE,
  push_promotional BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Add trigger for notification_preferences updates
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Function to log user activities (simplified)
CREATE OR REPLACE FUNCTION public.log_user_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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