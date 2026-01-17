-- Update English translations for all products with proper English content

UPDATE product_translations SET
  name = 'Hand-Woven Berber Straw Hat',
  description = 'This magnificent artisanal hat is handmade by our master artisans in the Rif mountains. Made from natural straw fibers, it offers optimal sun protection while ensuring breathability. The traditional Berber motifs woven into the band are inspired by ancestral symbols.',
  short_description = 'Authentic Berber hat handmade from natural straw',
  details = 'Material: Natural straw from the Rif - Crown diameter: 38cm - Brim width: 8cm - One size fits most - Weight: 180g - Made in Morocco',
  care = 'Dust with a soft brush. Store in a dry place away from direct sunlight. Reshape with steam if needed.',
  artisan_story = 'Made by Fatima and her cooperative of weavers in the village of Issaguen, where straw weaving has been passed down through generations for over 200 years.'
WHERE product_id = 1 AND locale = 'en';

UPDATE product_translations SET
  name = 'Handwoven Traditional Bag',
  description = 'This traditional woven bag combines ancestral Berber craftsmanship with modern functionality. Handmade by our artisans using natural fibers, it is both durable and elegant.',
  short_description = 'Traditional handwoven bag with Berber motifs',
  details = 'Material: Natural palm fibers - Dimensions: 35x30x15cm - Shoulder strap: adjustable - Interior: natural linen lining - Weight: 350g',
  care = 'Wipe with a damp cloth. Avoid prolonged exposure to rain. Store flat or stuffed.',
  artisan_story = 'Each bag is the work of Aicha, a master weaver from Chefchaouen, who has been practicing her art for over 30 years.'
WHERE product_id = 2 AND locale = 'en';

UPDATE product_translations SET
  name = 'Braided Crossbody Bag',
  description = 'This elegant crossbody bag is handmade by our artisans using traditional Berber braiding techniques. Its compact size makes it ideal for carrying your daily essentials.',
  short_description = 'Elegant braided crossbody bag, artisan craftsmanship',
  details = 'Material: Braided natural fibers - Dimensions: 25x20x8cm - Adjustable strap: 60-120cm - Magnetic closure - Weight: 280g',
  care = 'Clean with a soft brush. Protect from rain. Store hanging.',
  artisan_story = 'Handmade by Malika and her cooperative in Al Hoceima, preserving the ancient art of Rif braiding.'
WHERE product_id = 3 AND locale = 'en';

UPDATE product_translations SET
  name = 'Natural Fiber Tote Bag',
  description = 'This spacious tote is made from natural fibers grown and harvested in the Rif mountains. Its sturdy braided construction makes it perfect for shopping or everyday use.',
  short_description = 'Spacious natural fiber tote bag, Berber craftsmanship',
  details = 'Material: Natural Rif fibers - Dimensions: 40x35x20cm - Double handles - Natural linen interior - Weight: 400g',
  care = 'Clean with a damp cloth. Air dry only. Store in a dry place.',
  artisan_story = 'Made by the women of the Bni Ouriaghel cooperative, who combine traditional techniques with modern design.'
WHERE product_id = 4 AND locale = 'en';

UPDATE product_translations SET
  name = 'Artisanal Sun Hat',
  description = 'This elegant sun hat is handwoven from natural straw by the skilled artisans of the Rif. Its wide brim provides excellent sun protection while its light weight ensures comfort.',
  short_description = 'Elegant handwoven sun hat from natural straw',
  details = 'Material: Natural Rif straw - Brim width: 10cm - Crown height: 12cm - One size with adjustable inner band - Weight: 150g',
  care = 'Dust gently with a soft brush. Store flat or on a hat stand. Keep away from moisture.',
  artisan_story = 'Crafted by Hassan, a third-generation hat maker in Taza, using techniques passed down from his grandfather.'
WHERE product_id = 5 AND locale = 'en';

UPDATE product_translations SET
  name = 'Panama Style Natural Hat',
  description = 'This refined Panama-style hat is handwoven from the finest natural fibers by our master artisans. Perfect for summer days, it combines Berber tradition with timeless elegance.',
  short_description = 'Refined Panama-style hat, handwoven natural fibers',
  details = 'Material: Fine natural palm fibers - Crown height: 11cm - Brim width: 7cm - Natural leather band - Weight: 120g',
  care = 'Handle with care. Store in a hat box. Clean with a slightly damp cloth.',
  artisan_story = 'Each hat requires over 20 hours of work by Youssef, a master weaver recognized for his exceptional finesse.'
WHERE product_id = 6 AND locale = 'en';