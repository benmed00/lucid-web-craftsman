
-- Fix duplicate index on payments: drop the constraint instead
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS uniq_stripe_payment_intent;
