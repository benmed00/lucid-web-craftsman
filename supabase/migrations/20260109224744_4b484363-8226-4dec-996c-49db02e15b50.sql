-- Code promo de test ADMIN - produit à 1€
INSERT INTO public.discount_coupons (
  code,
  type,
  value,
  minimum_order_amount,
  maximum_discount_amount,
  usage_limit,
  per_user_limit,
  includes_free_shipping,
  is_active,
  valid_until
) VALUES (
  'ADMINTEST1',
  'fixed_amount',
  999999.00,  -- Réduit tout à quasi-rien
  NULL,       -- Pas de minimum
  999999.00,  -- Pas de max
  NULL,       -- Utilisation illimitée
  NULL,       -- Pas de limite par user
  true,       -- Livraison gratuite incluse
  true,
  '2030-12-31 23:59:59+00'  -- Valide longtemps
)
ON CONFLICT (code) DO UPDATE SET
  value = 999999.00,
  includes_free_shipping = true,
  is_active = true,
  valid_until = '2030-12-31 23:59:59+00';