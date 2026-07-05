import { defineMcp } from '@lovable.dev/mcp-js';
import searchProducts from './tools/search-products';
import getProduct from './tools/get-product';
import listCategories from './tools/list-categories';

export default defineMcp({
  name: 'rif-elegance-mcp',
  title: 'Rif Elegance — Catalogue MCP',
  version: '0.1.0',
  instructions:
    'Outils publics en lecture seule pour explorer le catalogue Rif Elegance (chapeaux et accessoires en paille artisanaux du Rif). Utilise `search_products` pour trouver des produits, `get_product` pour la fiche détaillée d’un slug, et `list_categories` pour lister les catégories disponibles.',
  tools: [searchProducts, getProduct, listCategories],
});
