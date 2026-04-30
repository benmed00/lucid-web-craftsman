-- Insert remaining products from local data
INSERT INTO public.products (id, name, price, images, category, description, details, care, is_new, artisan, artisan_story, related_products) VALUES

-- Update existing products with correct data
(3, 'Pochette Brodée à la Main', 62.00, ARRAY['/assets/images/produits_phares/sac_bandouliere.webp'], 'Sacs', 'Cette pochette brodée à la main présente des motifs traditionnels berbères réalisés avec des fils colorés sur une base de tissu robuste.', 'Dimensions: 25 x 15 cm\nMatériau: Coton et fils de soie\nFermeture éclair', 'Nettoyage délicat à la main', false, 'Aisha Tazi', null, null),

(4, 'Cabas en Fibres Naturelles', 75.00, ARRAY['/assets/images/produits_phares/sac_tresse_naturel.jpeg'], 'Sacs', 'Ce cabas spacieux est confectionné à partir de fibres végétales locales. Idéal pour les courses ou comme sac de plage.', 'Dimensions: 45 x 35 x 15 cm\nMatériau: Fibres naturelles tressées\nPoignées renforcées', 'Nettoyer avec un chiffon légèrement humide\nSécher à l''air libre\nÉviter l''eau salée', false, 'Omar Benali', null, null),

(5, 'Chapeau de Soleil Tressé', 52.00, ARRAY['/assets/images/produits_phares/chapeau_a_large_bord.webp', '/assets/images/produits_phares/chapeau_panama.webp'], 'Chapeaux', 'Chapeau élégant à large bord offrant une protection optimale contre le soleil. Parfait pour les journées d''été.', 'Taille unique avec cordon ajustable\nMatériau: Paille tressée à la main\nBord de 10 cm', 'Nettoyer avec une brosse douce\nÉviter l''eau', true, 'Rachid El Mansouri', null, null),

(6, 'Sac à Main Tissé Traditionnel Premium', 68.00, ARRAY['/assets/images/products/sac_a_main_tisse_traditionnel.jpg'], 'Sacs', 'Ce sac à main traditionnel premium est parfait pour les occasions spéciales, alliant fonctionnalité et esthétique artisanale berbère.', 'Dimensions: 35 x 25 x 15 cm\nMatériau: Cuir et fibres végétales\nPoignées en cuir véritable', 'Nettoyer avec un chiffon humide\nSécher à l''air libre\nTraiter le cuir régulièrement', false, 'Youssef Benali', null, null);

-- Update existing products with correct data and related products
UPDATE public.products SET 
  name = 'Sac à Main Tissé Traditionnel',
  price = 89.00,
  images = ARRAY['/assets/images/sacs/sac_traditionnel.jpg', '/assets/images/sacs/sac_traditionnel_vue1.jpg', '/assets/images/sacs/sac_traditionnel_vue2.jpg', '/assets/images/sacs/sac_traditionnel_vue3.jpg'],
  description = 'Ce sac à main tissé traditionnel est confectionné à la main par des artisans du Rif marocain. Chaque pièce est unique et représente des heures de travail minutieux. Les motifs berbères sont transmis de génération en génération.',
  details = 'Dimensions: 30 x 25 x 12 cm\nMatériau: Fibres végétales et laine\nDoublure intérieure en coton\nFermeture par bouton magnétique\nUne poche intérieure',
  care = 'Nettoyage à sec uniquement\nÉviter l''exposition prolongée au soleil\nConserver à l''abri de l''humidité',
  artisan = 'Fatima Ouazzani',
  artisan_story = 'Fatima vit dans un petit village des montagnes du Rif où elle a appris l''art du tissage de sa grand-mère dès l''âge de 12 ans. Elle consacre environ 18 heures à la création de chaque sac.',
  related_products = ARRAY[2, 3, 6]
WHERE id = 1;

UPDATE public.products SET 
  name = 'Chapeau de Paille Berbère',
  price = 45.00,
  images = ARRAY['/assets/images/products/chapeau_de_paille_berbere.jpg', '/assets/images/chapeau_de_paille_berbere_2.jpg'],
  description = 'Un chapeau traditionnel berbère tissé à la main avec des fibres de palmier nain, offrant une protection élégante contre le soleil méditerranéen.',
  details = 'Taille ajustable\nMatériau: Fibres de palmier nain\nRuban décoratif en coton tissé',
  care = 'Nettoyer avec une brosse douce\nNe pas plier ou écraser',
  is_new = false,
  artisan = 'Hassan Ameziane',
  artisan_story = null
WHERE id = 2;

-- Reset sequence to continue from correct number
SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));