-- Enrichir le contenu des 7 produits avec short_description, artisan_story, material, et SEO

-- Produit 1: Sac à Main Tissé Traditionnel
UPDATE products SET
  short_description = 'Sac artisanal berbère tissé main, motifs traditionnels du Rif',
  material = 'Fibres de palmier nain, fils de coton naturel',
  artisan_story = 'Fatima Ouazzani vit dans un petit village des montagnes du Rif où elle a appris l''art du tissage de sa grand-mère dès l''âge de 12 ans. Elle consacre environ 18 heures à la création de chaque sac, perpétuant un savoir-faire ancestral transmis depuis cinq générations.',
  seo_title = 'Sac Tissé Berbère Artisanal | Fait Main au Maroc',
  seo_description = 'Sac à main tissé traditionnel berbère, confectionné à la main par Fatima Ouazzani dans les montagnes du Rif. Motifs ancestraux, fibres naturelles. Livraison France.',
  is_featured = true
WHERE id = 1;

-- Produit 2: Chapeau de Paille Berbère
UPDATE products SET
  short_description = 'Chapeau traditionnel berbère en palmier nain, protection soleil élégante',
  material = 'Fibres de palmier nain (doum), finitions en raphia',
  artisan_story = 'Hassan Ameziane perpétue l''art du tressage rifain depuis 30 ans. Formé par son père, il maîtrise les techniques ancestrales de préparation des fibres de palmier. Chaque chapeau nécessite 2 jours de travail minutieux pour obtenir cette qualité exceptionnelle.',
  seo_title = 'Chapeau Paille Berbère | Artisanat Marocain Traditionnel',
  seo_description = 'Chapeau de paille berbère tissé main par Hassan Ameziane. Fibres de palmier nain du Rif marocain. Protection soleil naturelle et élégante. Pièce unique.',
  is_featured = true
WHERE id = 2;

-- Produit 3: Pochette Brodée à la Main
UPDATE products SET
  short_description = 'Pochette brodée main, motifs berbères colorés sur tissu artisanal',
  material = 'Tissu coton tissé main, fils de broderie en coton et soie',
  artisan_story = 'Aisha Tazi est une brodeuse reconnue de Chefchaouen. Elle a appris les motifs traditionnels berbères auprès des femmes de sa coopérative. Chaque pochette raconte une histoire à travers ses symboles : protection, fertilité, bonheur.',
  seo_title = 'Pochette Brodée Berbère | Artisanat Chefchaouen',
  seo_description = 'Pochette brodée à la main par Aisha Tazi de Chefchaouen. Motifs berbères traditionnels, fils colorés sur tissu artisanal. Accessoire unique fait main.',
  is_featured = false
WHERE id = 3;

-- Produit 4: Cabas en Fibres Naturelles
UPDATE products SET
  short_description = 'Grand cabas tressé en fibres végétales, idéal plage et marché',
  material = 'Fibres de jonc et palmier, anses en cuir végétal',
  artisan_story = 'Omar Benali travaille les fibres végétales depuis son enfance à Nador. Il sélectionne lui-même les joncs dans les zones humides du Rif et les prépare selon des méthodes traditionnelles. Son cabas allie robustesse et légèreté.',
  seo_title = 'Cabas Fibres Naturelles | Sac Plage Artisanal Maroc',
  seo_description = 'Cabas en fibres naturelles tissé par Omar Benali à Nador. Parfait pour la plage ou le marché. Fibres de jonc et palmier, anses cuir. Artisanat marocain.',
  is_featured = false
WHERE id = 4;

-- Produit 5: Chapeau de Soleil Tressé
UPDATE products SET
  short_description = 'Chapeau large bord tressé main, élégance estivale naturelle',
  material = 'Paille de blé naturelle, ruban en coton bio',
  artisan_story = 'Rachid El Mansouri est chapelier depuis 25 ans à Al Hoceima. Spécialiste des chapeaux à large bord, il utilise une technique de tressage serré qui garantit durabilité et protection optimale. Chaque pièce est signée de ses initiales.',
  seo_title = 'Chapeau Soleil Large Bord | Paille Naturelle Fait Main',
  seo_description = 'Chapeau de soleil tressé main par Rachid El Mansouri. Large bord protection UV, paille naturelle du Rif. Élégance estivale artisanale marocaine.',
  is_featured = true
WHERE id = 5;

-- Produit 6: Sac à Main Tissé Traditionnel Premium
UPDATE products SET
  short_description = 'Sac premium tissé main, finitions luxueuses et motifs raffinés',
  material = 'Fibres de palmier sélectionnées, doublure coton, fermoir artisanal',
  artisan_story = 'Youssef Benali dirige un atelier familial de 4 artisans à Tétouan. Ce sac premium représente le summum de leur savoir-faire : 25 heures de travail, fibres triées à la main, et finitions soignées. Chaque sac est numéroté et certifié.',
  seo_title = 'Sac Tissé Premium | Artisanat Berbère Luxe Maroc',
  seo_description = 'Sac à main tissé premium par l''atelier Youssef Benali à Tétouan. Finitions luxueuses, fibres sélectionnées, pièce numérotée. Artisanat berbère d''exception.',
  is_featured = false
WHERE id = 6;

-- Produit 7: Chapeau Panama Style
UPDATE products SET
  short_description = 'Chapeau style Panama en paille fine, allure chic intemporelle',
  material = 'Paille toquilla équatorienne, bandeau en cuir naturel',
  artisan_story = 'Meimona Gatena fusionne les techniques berbères avec l''élégance du Panama. Formée au Maroc et en Équateur, elle crée des pièces uniques qui allient tradition rifaine et sophistication internationale. Un pont entre deux cultures artisanales.',
  seo_title = 'Chapeau Panama Artisanal | Paille Fine Style Berbère',
  seo_description = 'Chapeau style Panama par Meimona Gatena. Fusion artisanat berbère et élégance Panama. Paille fine, bandeau cuir naturel. Pièce unique fait main.'
WHERE id = 7;