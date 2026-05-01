-- Enhance profiles table with additional user information
ALTER TABLE public.profiles 
ADD COLUMN phone VARCHAR(20),
ADD COLUMN location TEXT,
ADD COLUMN address_line1 TEXT,
ADD COLUMN address_line2 TEXT,
ADD COLUMN city VARCHAR(100),
ADD COLUMN postal_code VARCHAR(20),
ADD COLUMN country VARCHAR(100),
ADD COLUMN website_url TEXT,
ADD COLUMN instagram_handle VARCHAR(100),
ADD COLUMN facebook_url TEXT,
ADD COLUMN twitter_handle VARCHAR(100);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  order_updates BOOLEAN DEFAULT true,
  language VARCHAR(10) DEFAULT 'fr',
  currency VARCHAR(10) DEFAULT 'EUR',
  privacy_profile_public BOOLEAN DEFAULT false,
  privacy_show_email BOOLEAN DEFAULT false,
  privacy_show_phone BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on user preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE profiles.id = user_preferences.user_id));

CREATE POLICY "Users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE profiles.id = user_preferences.user_id));

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE profiles.id = user_preferences.user_id));

-- Create trigger for automatic timestamp updates on user preferences
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_profiles_phone ON public.profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_profiles_city ON public.profiles(city) WHERE city IS NOT NULL;