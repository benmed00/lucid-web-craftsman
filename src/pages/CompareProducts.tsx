import { X, GitCompareArrows, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductImage } from '@/components/ui/GlobalImage';
import { useCurrency } from '@/stores/currencyStore';
import { useCompareStore } from '@/stores/compareStore';
import PageFooter from '@/components/PageFooter';
import SEOHelmet from '@/components/seo/SEOHelmet';

const CompareProducts = () => {
  const { t } = useTranslation(['products', 'common']);
  const { items, removeItem, clear } = useCompareStore();
  const { formatPrice } = useCurrency();

  const specs = [
    {
      key: 'price',
      label: t('compare.price', 'Prix'),
      render: (p: (typeof items)[0]) => formatPrice(p.price),
    },
    {
      key: 'category',
      label: t('compare.category', 'Catégorie'),
      render: (p: (typeof items)[0]) => p.category,
    },
    {
      key: 'artisan',
      label: t('compare.artisan', 'Artisan'),
      render: (p: (typeof items)[0]) => p.artisan,
    },
    {
      key: 'rating',
      label: t('compare.rating', 'Note'),
      render: (p: (typeof items)[0]) =>
        p.rating_average
          ? `${p.rating_average.toFixed(1)} ★ (${p.rating_count})`
          : '—',
    },
    {
      key: 'stock',
      label: t('compare.availability', 'Disponibilité'),
      render: (p: (typeof items)[0]) =>
        p.is_available
          ? t('compare.inStock', 'En stock')
          : t('compare.outOfStock', 'Rupture'),
    },
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHelmet
          title="Comparer les produits | Rif Raw Straw"
          description="Comparez nos produits artisanaux côte à côte"
          url="/compare"
          type="website"
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <GitCompareArrows className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="font-serif text-3xl text-foreground mb-4">
            {t('compare.empty', 'Aucun produit à comparer')}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t(
              'compare.emptyHint',
              'Ajoutez des produits depuis le catalogue pour les comparer.'
            )}
          </p>
          <Button asChild>
            <Link to="/products">
              {t('compare.browseProducts', 'Parcourir les produits')}
            </Link>
          </Button>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHelmet
        title="Comparer les produits | Rif Raw Straw"
        description="Comparez nos produits artisanaux côte à côte"
        url="/compare"
        type="website"
      />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl text-foreground">
              {t('compare.title', 'Comparer les produits')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('compare.subtitle', '{{count}} produit(s) sélectionné(s)', {
                count: items.length,
              })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('compare.clearAll', 'Tout effacer')}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {/* Product images & names */}
            <thead>
              <tr>
                <th className="text-left p-4 w-40 text-sm font-medium text-muted-foreground">
                  {t('compare.product', 'Produit')}
                </th>
                {items.map((product) => (
                  <th key={product.id} className="p-4 text-center align-top">
                    <div className="relative">
                      <button
                        onClick={() => removeItem(product.id)}
                        className="absolute -top-2 -right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 transition-colors"
                        aria-label={t('compare.remove', 'Retirer')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <Link to={`/products/${product.id}`} className="block">
                        <div className="w-32 h-32 mx-auto mb-3 rounded-lg overflow-hidden border border-border">
                          <ProductImage
                            src={product.images?.[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <h3 className="font-medium text-foreground text-sm hover:text-primary transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      {product.is_new && (
                        <Badge className="mt-2 bg-primary text-primary-foreground text-xs">
                          {t('details.new', 'Nouveau')}
                        </Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Comparison rows */}
            <tbody>
              {specs.map((spec, i) => (
                <tr key={spec.key} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="p-4 text-sm font-medium text-muted-foreground">
                    {spec.label}
                  </td>
                  {items.map((product) => (
                    <td
                      key={product.id}
                      className="p-4 text-center text-sm text-foreground"
                    >
                      {spec.render(product)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Description row */}
              <tr className={specs.length % 2 === 0 ? 'bg-muted/30' : ''}>
                <td className="p-4 text-sm font-medium text-muted-foreground">
                  {t('compare.description', 'Description')}
                </td>
                {items.map((product) => (
                  <td
                    key={product.id}
                    className="p-4 text-sm text-muted-foreground text-left"
                  >
                    <p className="line-clamp-4">{product.description}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <PageFooter />
    </div>
  );
};

export default CompareProducts;
