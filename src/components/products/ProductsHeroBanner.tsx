import { useTranslation } from 'react-i18next';

export const ProductsHeroBanner = () => {
  const { t } = useTranslation('products');

  return (
    <div className="bg-secondary/50 border-b border-border/50 py-10 md:py-14 lg:py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-3 md:mb-4 leading-tight tracking-tight">
          {t('title')}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
      </div>
    </div>
  );
};
