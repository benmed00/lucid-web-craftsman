import { defineTool } from '@lovable.dev/mcp-js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SUPABASE_URL = 'https://xcvlijchkmhjonhfildm.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg';

export default defineTool({
  name: 'get_product',
  title: 'Détail d’un produit',
  description:
    'Récupère la fiche complète d’un produit Rif Elegance par son slug (ex: "chapeau-paille-capeline-naturel") : description, matière, entretien, artisan, dimensions, stock, prix.',
  inputSchema: {
    slug: z.string().min(1).describe('Slug URL du produit'),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ slug }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, slug, name, price, category, description, short_description, details, care, material, dimensions_cm, weight_grams, color, artisan, artisan_story, images, stock_quantity, is_available, rating_average, rating_count'
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error)
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    if (!data)
      return {
        content: [{ type: 'text', text: `Aucun produit avec le slug "${slug}".` }],
        isError: true,
      };
    return {
      content: [{ type: 'text', text: `${data.name} — ${data.price} €` }],
      structuredContent: { product: data },
    };
  },
});
