-- Fix generic copy-paste English bios with unique, accurate content per artisan

-- Fatima Benmoussa — Weaver from Rif/Chefchaouen
UPDATE artisan_translations
SET bio = 'Fatima learned the art of weaving from her grandmother in the Rif mountains. For 25 years, she has preserved ancestral textile techniques, transforming raw straw into intricate handwoven pieces that carry the heritage of her community.',
    bio_short = 'Master weaver from the Rif with 25 years of experience in ancestral textile arts.'
WHERE id = '61a4823b-f971-4bbd-a7bc-7afef29a46bd';

-- Hassan El Amrani — Hat-maker from Marrakech
UPDATE artisan_translations
SET bio = 'Hassan has been crafting artisan straw hats in Marrakech for over 30 years. Trained in the souks by master hatmakers, he shapes each piece by hand, combining traditional braiding techniques with an eye for timeless silhouettes.',
    bio_short = 'Master hat-maker from Marrakech, crafting artisan straw hats for over 30 years.'
WHERE id = '1b86ee42-abb4-4345-8b15-c68af0ce6f15';

-- Aicha Ouazzani — Embroiderer from Fès
UPDATE artisan_translations
SET bio = 'Aicha is a master embroiderer from Fès with 20 years of experience in traditional Berber patterns. Her delicate silk threadwork adorns our premium collections, adding hand-stitched finishing touches that elevate each piece.',
    bio_short = 'Master embroiderer from Fès specializing in traditional Berber patterns and silk threadwork.'
WHERE id = 'eed29845-7b60-47e2-beaf-9189b262f016';

-- Mohamed Tazi — Basketry from Essaouira
UPDATE artisan_translations
SET bio = 'Mohamed has worked with natural fibers since childhood in Essaouira. With 35 years of experience in doum palm and raphia weaving, he brings coastal craftsmanship traditions to our collection of handwoven bags and accessories.',
    bio_short = 'Basketry artisan from Essaouira with 35 years of experience working with natural fibers.'
WHERE id = '08c87de6-b8bf-45df-9481-42fdf73e7d6d';