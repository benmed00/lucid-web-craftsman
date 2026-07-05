import { defineTool } from '@lovable.dev/mcp-js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const SUPABASE_URL = 'https://xcvlijchkmhjonhfildm.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg';

export default defineTool({
  name: 'search_products',
  title: 'Rechercher des produits',
  description:
    'Recherche des produits Rif Elegance (chapeaux en paille, sacs, accessoires) par mot-clé, catégorie ou fourchette de prix. Retourne nom, prix, catégorie, stock et slug.',
  inputSchema: {
    query: z
      .string()
      .optional()
      .describe('Mot-clé recherché dans le nom ou la description'),
    category: z
      .string()
      .optional()
      .describe('Filtrer par catégorie exacte (ex: "chapeaux", "sacs")'),
    max_price: z
      .number()
      .positive()
      .optional()
      .describe('Prix maximum en EUR'),
    limit: z.number().int().min(1).max(50).default(10),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ query, category, max_price, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from('products')
      .select(
        'id, slug, name, price, category, short_description, stock_quantity, is_available, images'
      )
      .eq('is_active', true)
      .limit(limit);
    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (category) q = q.eq('category', category);
    if (max_price) q = q.lte('price', max_price);
    const { data, error } = await q;
    if (error)
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    return {
      content: [
        { type: 'text', text: `${data?.length ?? 0} produit(s) trouvé(s).` },
      ],
      structuredContent: { products: data ?? [] },
    };
  },
});
