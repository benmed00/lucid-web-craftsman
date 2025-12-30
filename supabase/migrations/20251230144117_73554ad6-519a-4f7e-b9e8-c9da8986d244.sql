-- Insert business rules configuration
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'business_rules',
  '{
    "cart": {
      "maxQuantityPerItem": 10,
      "maxProductTypes": 10,
      "highValueThreshold": 1000,
      "minOrderAmount": 0,
      "maxOrderAmount": 10000
    },
    "wishlist": {
      "maxItems": 10
    },
    "checkout": {
      "requireEmailVerification": false,
      "allowGuestCheckout": true,
      "showVipContactForHighValue": true
    },
    "contact": {
      "vipEmail": "vip@rifrawstraw.com",
      "vipPhone": "+33600000000"
    }
  }'::jsonb,
  'Business rules for cart, wishlist, and checkout. Configurable from admin dashboard.'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();