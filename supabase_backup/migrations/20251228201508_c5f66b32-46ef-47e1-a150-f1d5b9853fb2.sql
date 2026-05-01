-- Update product 7 "Chapeaux Soleil" with existing hat images from storage
UPDATE public.products 
SET images = ARRAY[
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-2-1755386355577-fxizrcbkc1c.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-5-1755392501238-9qf2vyopl4l.jpg',
  'https://xcvlijchkmhjonhfildm.supabase.co/storage/v1/object/public/product-images/product-5-1755385402680-pn72nnv6gdn.jpg'
]
WHERE id = 7;