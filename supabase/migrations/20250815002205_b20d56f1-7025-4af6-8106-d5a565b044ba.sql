-- Create loyalty program tables
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_points_spent INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  tier_progress INTEGER NOT NULL DEFAULT 0,
  next_tier_threshold INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create loyalty transactions table for point history
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earned', 'spent', 'bonus', 'refund'
  source_type TEXT NOT NULL, -- 'order', 'review', 'referral', 'manual'
  source_id TEXT, -- order_id, review_id, etc.
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'refund')),
  CONSTRAINT valid_source_type CHECK (source_type IN ('order', 'review', 'referral', 'manual', 'signup_bonus'))
);

-- Create loyalty rewards table
CREATE TABLE public.loyalty_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  reward_type TEXT NOT NULL, -- 'discount', 'free_shipping', 'product'
  reward_value JSONB NOT NULL, -- discount percentage, product info, etc.
  min_tier TEXT NOT NULL DEFAULT 'bronze',
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit INTEGER, -- null = unlimited
  usage_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_reward_type CHECK (reward_type IN ('discount', 'free_shipping', 'product')),
  CONSTRAINT valid_min_tier CHECK (min_tier IN ('bronze', 'silver', 'gold', 'platinum'))
);

-- Create user reward redemptions table
CREATE TABLE public.loyalty_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired'
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  order_id UUID, -- when reward is applied to an order
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_redemption_status CHECK (status IN ('active', 'used', 'expired'))
);

-- Enable RLS on all tables
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_points
CREATE POLICY "Users can view their own loyalty points" 
ON public.loyalty_points 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loyalty points" 
ON public.loyalty_points 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty points" 
ON public.loyalty_points 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loyalty points" 
ON public.loyalty_points 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- RLS Policies for loyalty_transactions
CREATE POLICY "Users can view their own loyalty transactions" 
ON public.loyalty_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert loyalty transactions" 
ON public.loyalty_transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all loyalty transactions" 
ON public.loyalty_transactions 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- RLS Policies for loyalty_rewards
CREATE POLICY "Loyalty rewards are publicly readable" 
ON public.loyalty_rewards 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage loyalty rewards" 
ON public.loyalty_rewards 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- RLS Policies for loyalty_redemptions
CREATE POLICY "Users can view their own redemptions" 
ON public.loyalty_redemptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions" 
ON public.loyalty_redemptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own redemptions" 
ON public.loyalty_redemptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all redemptions" 
ON public.loyalty_redemptions 
FOR ALL 
USING (is_admin_user(auth.uid()));

-- Create function to update loyalty tier based on total points
CREATE OR REPLACE FUNCTION public.update_loyalty_tier(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_points INTEGER;
  new_tier TEXT;
  new_progress INTEGER;
  new_threshold INTEGER;
BEGIN
  -- Get current total points earned
  SELECT total_points_earned INTO total_points
  FROM public.loyalty_points
  WHERE user_id = user_uuid;

  -- Determine tier based on total points earned
  IF total_points >= 5000 THEN
    new_tier := 'platinum';
    new_progress := total_points - 5000;
    new_threshold := 0; -- Max tier
  ELSIF total_points >= 2000 THEN
    new_tier := 'gold';
    new_progress := total_points - 2000;
    new_threshold := 5000;
  ELSIF total_points >= 500 THEN
    new_tier := 'silver';
    new_progress := total_points - 500;
    new_threshold := 2000;
  ELSE
    new_tier := 'bronze';
    new_progress := total_points;
    new_threshold := 500;
  END IF;

  -- Update the user's tier
  UPDATE public.loyalty_points
  SET 
    tier = new_tier,
    tier_progress = new_progress,
    next_tier_threshold = new_threshold,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$;

-- Create function to add loyalty points
CREATE OR REPLACE FUNCTION public.add_loyalty_points(
  user_uuid UUID,
  points INTEGER,
  transaction_type TEXT,
  source_type TEXT,
  source_id TEXT DEFAULT NULL,
  description TEXT DEFAULT 'Points earned'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- Create function to initialize loyalty account for new users
CREATE OR REPLACE FUNCTION public.init_loyalty_account(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert initial loyalty points record
  INSERT INTO public.loyalty_points (
    user_id, points_balance, total_points_earned, total_points_spent, tier
  ) VALUES (
    user_uuid, 100, 100, 0, 'bronze'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add signup bonus transaction
  INSERT INTO public.loyalty_transactions (
    user_id, points_change, transaction_type, source_type, description
  ) VALUES (
    user_uuid, 100, 'bonus', 'signup_bonus', 'Bonus de bienvenue'
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Update handle_new_user trigger to initialize loyalty account
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  -- Initialize loyalty account with welcome bonus
  PERFORM public.init_loyalty_account(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_rewards_updated_at
  BEFORE UPDATE ON public.loyalty_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default rewards
INSERT INTO public.loyalty_rewards (name, description, points_cost, reward_type, reward_value, min_tier) VALUES
('Réduction 5%', 'Réduction de 5% sur votre prochaine commande', 200, 'discount', '{"percentage": 5, "min_order": 50}', 'bronze'),
('Réduction 10%', 'Réduction de 10% sur votre prochaine commande', 400, 'discount', '{"percentage": 10, "min_order": 100}', 'silver'),
('Livraison gratuite', 'Livraison gratuite sur votre prochaine commande', 300, 'free_shipping', '{"applies_to": "any"}', 'bronze'),
('Réduction 15%', 'Réduction de 15% sur votre prochaine commande', 700, 'discount', '{"percentage": 15, "min_order": 150}', 'gold'),
('Réduction 20%', 'Réduction de 20% sur votre prochaine commande', 1000, 'discount', '{"percentage": 20, "min_order": 200}', 'platinum');