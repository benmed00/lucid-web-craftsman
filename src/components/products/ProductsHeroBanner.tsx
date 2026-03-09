import { useTranslation } from 'react-i18next';

export const ProductsHeroBanner = () => {
  const { t } = useTranslation('products');

  return (
    <div className="bg-gradient-to-r from-secondary to-muted py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 text-center">
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4 leading-tight">
          {t('title')}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
      </div>
    </div>
  );
};
