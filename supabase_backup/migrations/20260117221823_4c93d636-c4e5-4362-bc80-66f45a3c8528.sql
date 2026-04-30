-- Add more tags for blog posts
INSERT INTO public.tag_translations (tag_key, fr, en, ar, es, de) VALUES
  ('Été', 'Été', 'Summer', 'صيف', 'Verano', 'Sommer'),
  ('Plage', 'Plage', 'Beach', 'شاطئ', 'Playa', 'Strand'),
  ('Nature', 'Nature', 'Nature', 'طبيعة', 'Naturaleza', 'Natur'),
  ('Écologique', 'Écologique', 'Eco-friendly', 'بيئي', 'Ecológico', 'Umweltfreundlich'),
  ('Voyage', 'Voyage', 'Travel', 'سفر', 'Viaje', 'Reise'),
  ('Maroc', 'Maroc', 'Morocco', 'المغرب', 'Marruecos', 'Marokko'),
  ('Rif', 'Rif', 'Rif', 'الريف', 'Rif', 'Rif'),
  ('Femmes', 'Femmes', 'Women', 'نساء', 'Mujeres', 'Frauen'),
  ('Accessoires', 'Accessoires', 'Accessories', 'إكسسوارات', 'Accesorios', 'Accessoires'),
  ('Tendance', 'Tendance', 'Trend', 'موضة', 'Tendencia', 'Trend'),
  ('Décoration', 'Décoration', 'Decoration', 'ديكور', 'Decoración', 'Dekoration'),
  ('Tissage', 'Tissage', 'Weaving', 'نسج', 'Tejido', 'Weben'),
  ('Culture', 'Culture', 'Culture', 'ثقافة', 'Cultura', 'Kultur'),
  ('Symboles', 'Symboles', 'Symbols', 'رموز', 'Símbolos', 'Symbole'),
  ('Histoire', 'Histoire', 'History', 'تاريخ', 'Historia', 'Geschichte')
ON CONFLICT (tag_key) DO NOTHING;