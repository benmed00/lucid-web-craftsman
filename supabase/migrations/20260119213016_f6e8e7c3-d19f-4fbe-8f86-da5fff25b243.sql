-- Complete French translations with all fields from products table
UPDATE public.product_translations pt SET
  short_description = p.short_description,
  artisan_story = p.artisan_story,
  material = p.material,
  seo_title = p.seo_title,
  seo_description = p.seo_description
FROM public.products p
WHERE pt.product_id = p.id AND pt.locale = 'fr';

-- Complete English translations with proper content
UPDATE public.product_translations SET
  short_description = 'Artisan Berber bag hand-woven using traditional Rif techniques',
  artisan_story = 'Fatima Ouazzani lives in a small Rif mountain village where she learned weaving from her grandmother at age 12. She dedicates about 18 hours to creating each bag, preserving ancestral know-how passed down for five generations.',
  material = 'Dwarf palm fibers, natural cotton thread',
  seo_title = 'Handwoven Berber Bag | Handmade in Morocco',
  seo_description = 'Traditional Berber handwoven bag, handcrafted by Fatima Ouazzani in the Rif mountains. Ancestral patterns, natural fibers. Unique artisan piece.'
WHERE product_id = 1 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Traditional Berber dwarf palm hat, elegant sun protection',
  artisan_story = 'Hassan Ameziane has been perpetuating the art of Rif braiding for 30 years. Trained by his father, he masters ancestral palm fiber preparation techniques. Each hat requires 2 days of meticulous work.',
  material = 'Dwarf palm fibers (doum), raffia finishes',
  seo_title = 'Berber Straw Hat | Traditional Moroccan Craft',
  seo_description = 'Berber straw hat handwoven by Hassan Ameziane. Moroccan Rif dwarf palm fibers. Natural, elegant sun protection. Unique piece.'
WHERE product_id = 2 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Hand-embroidered clutch, colorful Berber patterns on artisan fabric',
  artisan_story = 'Aisha Tazi is a renowned embroiderer from Chefchaouen. She learned traditional Berber patterns from women in her cooperative. Each clutch tells a story through its symbols: protection, fertility, happiness.',
  material = 'Hand-woven cotton fabric, cotton and silk embroidery threads',
  seo_title = 'Berber Embroidered Clutch | Chefchaouen Craft',
  seo_description = 'Hand-embroidered clutch by Aisha Tazi from Chefchaouen. Traditional Berber patterns, colorful threads on artisan fabric. Unique handmade accessory.'
WHERE product_id = 3 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Large woven natural fiber tote, perfect for beach and market',
  artisan_story = 'Omar Benali has worked with plant fibers since childhood in Nador. He personally selects rushes from Rif wetlands and prepares them using traditional methods. His tote combines sturdiness and lightness.',
  material = 'Rush and palm fibers, vegan leather handles',
  seo_title = 'Natural Fiber Tote Bag | Artisan Beach Bag Morocco',
  seo_description = 'Natural fiber tote bag woven by Omar Benali in Nador. Perfect for beach or market. Rush and palm fibers, leather handles. Moroccan craftsmanship.'
WHERE product_id = 4 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Wide-brim handwoven hat, natural summer elegance',
  artisan_story = 'Rachid El Mansouri has been a hat maker for 25 years in Al Hoceima. Specializing in wide-brimmed hats, he uses a tight braiding technique that ensures durability and optimal protection. Each piece is signed with his initials.',
  material = 'Natural wheat straw, organic cotton ribbon',
  seo_title = 'Wide Brim Sun Hat | Natural Handwoven Straw',
  seo_description = 'Handwoven sun hat by Rachid El Mansouri. Wide brim UV protection, natural Rif straw. Artisan Moroccan summer elegance.'
WHERE product_id = 5 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Premium handwoven bag, luxurious finishes and refined patterns',
  artisan_story = 'Youssef Benali runs a family workshop of 4 artisans in Tetouan. This premium bag represents the pinnacle of their craftsmanship: 25 hours of work, hand-sorted fibers, and meticulous finishes. Each bag is numbered and certified.',
  material = 'Selected palm fibers, cotton lining, artisan clasp',
  seo_title = 'Premium Woven Bag | Luxury Berber Craft Morocco',
  seo_description = 'Premium handwoven bag by Youssef Benali workshop in Tetouan. Luxurious finishes, selected fibers, numbered piece. Exceptional Berber craftsmanship.'
WHERE product_id = 6 AND locale = 'en';

UPDATE public.product_translations SET
  short_description = 'Panama-style fine straw hat, timeless chic look',
  artisan_story = 'Meimona Gatena fuses Berber techniques with Panama elegance. Trained in Morocco and Ecuador, she creates unique pieces that combine Rif tradition with international sophistication. A bridge between two artisan cultures.',
  material = 'Ecuadorian toquilla straw, natural leather band',
  seo_title = 'Artisan Panama Hat | Fine Straw Berber Style',
  seo_description = 'Panama-style hat by Meimona Gatena. Berber craft and Panama elegance fusion. Fine straw, natural leather band. Unique handmade piece.'
WHERE product_id = 7 AND locale = 'en';