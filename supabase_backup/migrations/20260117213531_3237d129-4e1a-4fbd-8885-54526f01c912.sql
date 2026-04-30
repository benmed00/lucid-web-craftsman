-- Fix function search_path
CREATE OR REPLACE FUNCTION update_translation_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Seed English translations for products
INSERT INTO public.product_translations (product_id, locale, name, description, short_description, details, care, artisan_story, seo_title, seo_description)
SELECT 
  id,
  'en',
  CASE 
    WHEN id = 5 THEN 'Hand-Woven Sun Hat'
    WHEN id = 6 THEN 'Traditional Woven Handbag Premium'
    WHEN id = 7 THEN 'Sun Hats'
    ELSE name -- fallback
  END,
  CASE 
    WHEN id = 5 THEN 'Elegant wide-brimmed hat offering optimal sun protection. Perfect for summer days and outdoor activities.'
    WHEN id = 6 THEN 'This premium traditional handbag is perfect for special occasions, combining functionality with Berber artisan aesthetics.'
    WHEN id = 7 THEN 'A handmade product crafted with care, symbolizing the craftsmanship of Meimona and her artistic style choices in decoration and weaving patterns. Made to last and to be inherited.'
    ELSE description
  END,
  short_description,
  CASE 
    WHEN id = 5 THEN 'Hand-woven from natural palm fibers by Rif artisans. Flexible yet sturdy construction. Wide brim for sun protection.'
    WHEN id = 6 THEN 'Hand-woven from natural fibers. Traditional Berber patterns. Reinforced handles. Cotton lining.'
    WHEN id = 7 THEN 'Hand-woven natural fibers. Traditional Amazigh patterns. Lightweight and breathable design.'
    ELSE details
  END,
  CASE 
    WHEN id = 5 THEN 'Store in a dry, ventilated place. Do not wash with water. Dust with a soft brush. Avoid prolonged sun exposure when not worn.'
    WHEN id = 6 THEN 'Wipe with a damp cloth. Do not machine wash. Store away from humidity. Allow to dry naturally if wet.'
    WHEN id = 7 THEN 'Store flat or hanging. Clean with dry brush. Avoid moisture. Handle with care.'
    ELSE care
  END,
  artisan_story,
  CASE 
    WHEN id = 5 THEN 'Hand-Woven Sun Hat | Rif Raw Straw'
    WHEN id = 6 THEN 'Traditional Woven Handbag | Rif Raw Straw'
    WHEN id = 7 THEN 'Artisan Sun Hats | Rif Raw Straw'
    ELSE seo_title
  END,
  CASE 
    WHEN id = 5 THEN 'Handcrafted wide-brimmed sun hat woven from natural palm fibers by Moroccan artisans. Perfect summer accessory.'
    WHEN id = 6 THEN 'Premium traditional Berber handbag, handwoven with natural fibers. Unique artisan craftsmanship from Morocco.'
    WHEN id = 7 THEN 'Beautiful handmade sun hats crafted by traditional artisans using ancestral weaving techniques.'
    ELSE seo_description
  END
FROM public.products
ON CONFLICT (product_id, locale) DO NOTHING;

-- Seed English translations for blog posts
INSERT INTO public.blog_post_translations (blog_post_id, locale, title, excerpt, content, seo_title, seo_description)
SELECT 
  id,
  'en',
  CASE slug
    WHEN 'art-tissage-traditionnel-rif' THEN 'The Art of Traditional Weaving in the Rif Mountains'
    WHEN 'materiaux-naturels-fibres-vegetales' THEN 'Natural Materials: The Beauty of Plant Fibers'
    WHEN 'rencontre-amina-maitre-artisane' THEN 'Meet Amina, Master Artisan for 40 Years'
    WHEN 'symboles-berberes-creations' THEN 'Berber Symbols in Our Creations'
    WHEN 'entretenir-sac-fibres-naturelles' THEN 'How to Care for Your Natural Fiber Bag'
    WHEN 'engagement-commerce-equitable' THEN 'Our Commitment to Fair Trade'
    ELSE title
  END,
  CASE slug
    WHEN 'art-tissage-traditionnel-rif' THEN 'Discover how artisans pass down their techniques from generation to generation while adapting their craftsmanship to modern trends.'
    WHEN 'materiaux-naturels-fibres-vegetales' THEN 'What materials are used in crafting our bags and hats? An exploration of the local and sustainable fibers we prioritize.'
    WHEN 'rencontre-amina-maitre-artisane' THEN 'A touching portrait of one of the oldest artisans in our cooperative, who perpetuates ancestral know-how with passion and dedication.'
    WHEN 'symboles-berberes-creations' THEN 'Every pattern tells a story. Discover the meaning of the ancestral symbols you find on our artisanal creations.'
    WHEN 'entretenir-sac-fibres-naturelles' THEN 'Our expert tips to preserve the beauty and extend the life of your artisanal natural fiber accessories.'
    WHEN 'engagement-commerce-equitable' THEN 'How we ensure fair working conditions and equitable compensation for all artisans who collaborate with our brand.'
    ELSE excerpt
  END,
  CASE slug
    WHEN 'art-tissage-traditionnel-rif' THEN E'## The Ancestral Heritage of Rif Weaving\n\nIn the steep mountains of the Moroccan Rif, an age-old craft has been passed down from mother to daughter for generations. Traditional weaving, far from being just an artisanal technique, represents a true living cultural heritage.\n\nEvery gesture, every knot, every pattern tells a story. The artisans perpetuate not only techniques but also a philosophy of life based on respect for nature and the value of manual work.\n\n## Techniques Passed Down Through Generations\n\nThe traditional loom, called "handira," is at the heart of this craft. Made from local wood, it creates unique pieces with geometric patterns characteristic of the region. Young apprentices begin at an early age observing their elders, before gradually taking hold of the threads and shuttles.\n\nPreparing natural fibers is a crucial step. Palm doum leaves are harvested, dried, and worked for several days before they can be woven. This patience and respect for time are fundamental values of Rif craftsmanship.\n\n## Adapting to Modern Trends\n\nWhile techniques remain traditional, creations evolve to meet contemporary tastes. Artisans don''t hesitate to experiment with new natural colors, adapt the formats of their creations, or collaborate with designers to create unique pieces.\n\nThis ability to adapt while preserving the authenticity of the craft is the key to its sustainability. Young generations thus find a balance between tradition and modernity.'
    WHEN 'materiaux-naturels-fibres-vegetales' THEN E'## The Richness of Natural Fibers\n\nMorocco is rich in natural resources that form the basis of our craft. From the Rif mountains to the southern oases, each region offers unique materials with exceptional properties.\n\nOur artisans primarily work with three types of fibers: doum palm, raffia, and wheat straw. Each has its own characteristics and lends itself to different creations.\n\n## Doum Palm, King of Fibers\n\nThe doum palm, or "Chamaerops humilis," grows naturally in the coastal and mountainous regions of Morocco. Its leaves, once dried and prepared, offer a supple and resistant fiber, ideal for making bags and baskets.\n\nHarvesting is done sustainably, taking only mature leaves without damaging the plant''s heart. This ancestral practice ensures the sustainability of this precious resource.\n\n## An Ecological and Sustainable Choice\n\nBy choosing natural and local fibers, we reduce our environmental impact while supporting the local economy. Unlike synthetic materials, our fibers are biodegradable and generate no pollution.\n\nFurthermore, the fiber preparation process is entirely natural: sun drying, plant dyes, no chemicals. A responsible choice for ethical fashion.'
    WHEN 'rencontre-amina-maitre-artisane' THEN E'## A Life Dedicated to Craft\n\nAt 65, Amina is one of the doyennes of our cooperative. Her expert hands have woven thousands of creations throughout her life, and today she still passes on her knowledge to the younger generation with infinite patience.\n\n"I started weaving at the age of 8, alongside my grandmother," she tells us with a smile. "Back then, every family made their own baskets and bags. It was a necessity, but also a pleasure."\n\n## The Evolution of a Craft\n\nOver the decades, Amina has seen her trade transform. From domestic production, weaving has become a full economic activity, allowing women in the region to gain financial independence.\n\n"Before, we wove for our families. Now, our creations travel around the world. It''s a great pride."\n\n## Transmitting to Preserve\n\nEvery week, Amina welcomes young apprentices to her workshop. She teaches them not only techniques but also values: patience, precision, respect for materials.\n\n"The most important thing is to take your time. Beautiful weaving is not done in a hurry. You have to listen to the fibers, feel their resistance, respect their nature."\n\nFor Amina, transmission is essential: "If we don''t train the new generation, our art will disappear. It''s our responsibility to preserve it."'
    WHEN 'symboles-berberes-creations' THEN E'## An Ancestral Visual Language\n\nBerber patterns are not mere decorations. They constitute a true symbolic language, passed down for millennia. Each shape, each line has a deep meaning, rooted in Amazigh culture.\n\n## The Most Common Symbols\n\n**The Berber Cross (Yaz)**: Symbol of free man, it represents the letter "Z" of the Tifinagh alphabet and embodies Amazigh identity.\n\n**The Diamond**: Symbol of fertility and femininity, it evokes the maternal womb and the continuity of life.\n\n**The Triangle**: Pointing upward, it symbolizes masculinity. Downward, it represents femininity. Together, they express balance and harmony.\n\n**The Spiral**: It symbolizes eternity, the cycle of life, and the connection between past and future.\n\n## Integration in Our Creations\n\nOur artisans integrate these symbols into their weavings with respect and intention. Each creation thus tells a story, carries a message.\n\n"When I weave a pattern, I think about its meaning," explains Fatima, one of our artisans. "It''s a way of blessing the object and transmitting positive energy to whoever will wear it."\n\nThus, every bag, every hat you wear is not just an accessory. It''s a fragment of culture, a living heritage that crosses borders and generations.'
    WHEN 'entretenir-sac-fibres-naturelles' THEN E'## Caring for Your Artisan Bag\n\nYour natural fiber bag is a unique piece, handmade with noble materials. With a few simple gestures, you can preserve its beauty for many years.\n\n## Regular Cleaning\n\n**For dust**: Use a soft brush or dry cloth to dust your bag regularly. A simple brush stroke is enough to restore its shine.\n\n**For light stains**: Dab gently with a damp cloth (not wet). Let dry naturally, in the open air, away from any heat source.\n\n**Important**: Absolutely avoid submerging your bag in water or machine washing it. Natural fibers are sensitive to water and could deform.\n\n## Storage\n\nWhen not using your bag, store it in a dry, ventilated place. Avoid airtight plastic bags which could promote mold.\n\nTo maintain its shape, you can lightly stuff it with tissue paper. Don''t crush it under other heavy objects.\n\n## Protection and Maintenance\n\n**Against humidity**: If your bag is exposed to rain, let it dry naturally, flat, in a ventilated area. Don''t place it near a radiator.\n\n**Against sun**: Prolonged sun exposure can fade the fibers. Avoid leaving your bag in direct sunlight for long hours.\n\nWith these few attentions, your artisan bag will accompany you for many years, even developing a beautiful patina that will attest to its history.'
    WHEN 'engagement-commerce-equitable' THEN E'## An Ethical Vision of Craft\n\nAt Rif Raw Straw, we believe a beautiful object must be created in beautiful conditions. Our commitment to fair trade is not a marketing argument but a deep conviction that guides each of our actions.\n\n## Fair Compensation\n\nWe work directly with artisans, without intermediaries. This allows us to guarantee them fair compensation, well above local market prices.\n\n"Before, I sold my creations at the market for a few dirhams," testifies Khadija, one of our artisans. "Today, I earn a decent living and can offer my children a future."\n\n## Respectful Working Conditions\n\nOur artisans work at their own pace, from home or in our collective workshops. No pressure, no quotas: quality takes precedence over quantity.\n\nWe also provide raw materials, which prevents artisans from advancing costs. Payments are made upon delivery, without delay.\n\n## Concrete Social Impact\n\nPart of our profits is reinvested in the community: professional training, literacy, support for families in difficulty.\n\n"Thanks to the cooperative, I learned to read and write," says Zahra, 45. "I can now help my children with their homework."\n\n## Transparency and Traceability\n\nEach creation comes with a card indicating the name of the artisan who made it. This transparency allows you to know exactly where your accessory comes from and who made it.'
    ELSE content
  END,
  CASE slug
    WHEN 'art-tissage-traditionnel-rif' THEN 'The Art of Traditional Weaving in the Rif Mountains | Rif Raw Straw'
    WHEN 'materiaux-naturels-fibres-vegetales' THEN 'Natural Materials: Plant Fibers | Rif Raw Straw'
    WHEN 'rencontre-amina-maitre-artisane' THEN 'Meet Amina, Master Artisan | Rif Raw Straw'
    WHEN 'symboles-berberes-creations' THEN 'Berber Symbols in Our Creations | Rif Raw Straw'
    WHEN 'entretenir-sac-fibres-naturelles' THEN 'Caring for Natural Fiber Bags | Rif Raw Straw'
    WHEN 'engagement-commerce-equitable' THEN 'Our Fair Trade Commitment | Rif Raw Straw'
    ELSE seo_title
  END,
  CASE slug
    WHEN 'art-tissage-traditionnel-rif' THEN 'Discover how Rif mountain artisans pass down traditional weaving techniques through generations while adapting to modern trends.'
    WHEN 'materiaux-naturels-fibres-vegetales' THEN 'Explore the natural and sustainable fibers used in our handcrafted bags and hats from Morocco.'
    WHEN 'rencontre-amina-maitre-artisane' THEN 'Meet Amina, a master artisan who has been weaving for 40 years, preserving ancestral Moroccan craftsmanship.'
    WHEN 'symboles-berberes-creations' THEN 'Learn the meaning behind traditional Berber symbols found in our artisanal Moroccan creations.'
    WHEN 'entretenir-sac-fibres-naturelles' THEN 'Expert tips on how to care for and maintain your natural fiber bag to preserve its beauty for years.'
    WHEN 'engagement-commerce-equitable' THEN 'Learn about our fair trade practices and how we ensure ethical working conditions for our Moroccan artisans.'
    ELSE seo_description
  END
FROM public.blog_posts
ON CONFLICT (blog_post_id, locale) DO NOTHING;