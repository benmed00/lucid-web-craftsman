import { defineTool } from '@lovable.dev/mcp-js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xcvlijchkmhjonhfildm.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjdmxpamNoa21oam9uaGZpbGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDY3MDEsImV4cCI6MjA2MzE4MjcwMX0.3_FZWbV4qCqs1xQmh0Hws83xQxofSApzVRScSCEi9Pg';

export default defineTool({
  name: 'list_categories',
  title: 'Lister les catégories',
  description:
    'Retourne la liste distincte des catégories de produits disponibles dans le catalogue Rif Elegance, avec le nombre de produits par catégorie.',
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_active', true);
    if (error)
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const c = (row as { category: string }).category;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const categories = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return {
      content: [
        { type: 'text', text: `${categories.length} catégories.` },
      ],
      structuredContent: { categories },
    };
  },
});
