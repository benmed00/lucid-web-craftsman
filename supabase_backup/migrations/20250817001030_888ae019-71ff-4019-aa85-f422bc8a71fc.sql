-- Enhanced User Profiles - Add Missing Features
-- Only adds what's missing to work with existing database structure

-- 1. Add missing columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_marketing": true,
  "order_updates": true,
  "loyalty_updates": true,
  "security_alerts": true
}';

-- 2. Create support ticket messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.support_ticket_descriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.support_tickets(id) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.support_ticket_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view descriptions for their own tickets" ON public.support_ticket_descriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    ) OR public.is_admin_user(auth.uid())
  );

CREATE POLICY "Users can create descriptions for their own tickets" ON public.support_ticket_descriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- 3. Add indexes for better performance on existing tables
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_tier ON public.loyalty_points(tier);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

-- 4. Update user_preferences table to work better with profiles
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Paris';

-- 5. Add additional security event types for better monitoring
INSERT INTO public.security_config (setting_name, setting_value, description)
VALUES 
  ('profile_update_monitoring', 'true', 'Monitor profile updates for suspicious activity'),
  ('loyalty_fraud_detection', 'true', 'Enable fraud detection for loyalty transactions'),
  ('support_ticket_rate_limit', '10', 'Maximum support tickets per user per day')
ON CONFLICT (setting_name) DO NOTHING;

-- 6. Create a view for enhanced profile information (combining profiles + preferences + loyalty)
CREATE OR REPLACE VIEW public.enhanced_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.bio,
  p.avatar_url,
  p.phone,
  p.location,
  p.address_line1,
  p.address_line2,
  p.city,
  p.postal_code,
  p.country,
  p.website_url,
  p.instagram_handle,
  p.facebook_url,
  p.twitter_handle,
  p.preferences,
  p.notification_settings,
  p.created_at,
  p.updated_at,
  lp.points_balance,
  lp.tier,
  lp.total_points_earned,
  up.language,
  up.currency,
  up.theme_preference,
  up.timezone,
  up.email_notifications,
  up.marketing_emails,
  up.order_updates,
  CASE 
    WHEN p.full_name IS NOT NULL AND p.phone IS NOT NULL AND p.location IS NOT NULL 
    THEN 'complete' 
    ELSE 'incomplete' 
  END as profile_completion_status
FROM public.profiles p
LEFT JOIN public.loyalty_points lp ON p.id = lp.user_id
LEFT JOIN public.user_preferences up ON p.id = up.user_id;

-- Add RLS to the view
CREATE POLICY "Users can view their own enhanced profile" ON public.enhanced_profiles
  FOR SELECT USING (auth.uid() = id);

-- 7. Create function to get profile completion percentage
CREATE OR REPLACE FUNCTION public.get_profile_completion_percentage(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_fields INTEGER := 10;
  completed_fields INTEGER := 0;
  profile_record RECORD;
BEGIN
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid;
  
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
  
  IF profile_record.address_line1 IS NOT NULL AND profile_record.address_line1 != '' THEN
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
  
  IF profile_record.website_url IS NOT NULL AND profile_record.website_url != '' THEN
    completed_fields := completed_fields + 1;
  END IF;
  
  RETURN ROUND((completed_fields::DECIMAL / total_fields) * 100);
END;
$$;

-- 8. Add notification preferences table for granular control
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

-- 9. Create activity log table for user actions
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity log" ON public.user_activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user activity" ON public.user_activity_log
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view all activity logs" ON public.user_activity_log
  FOR SELECT USING (public.is_admin_user(auth.uid()));

-- Add index for user activity log
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON public.user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_activity_type ON public.user_activity_log(activity_type);

-- 10. Function to log user activities
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
  INSERT INTO public.user_activity_log (
    user_id, activity_type, activity_description, metadata, ip_address, user_agent
  ) VALUES (
    p_user_id, 
    p_activity_type, 
    p_description, 
    p_metadata,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;