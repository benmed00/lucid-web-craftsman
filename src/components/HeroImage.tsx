// Using native CSS aspect-ratio instead of Radix AspectRatio to avoid forced reflow
import { useHeroImage } from '@/hooks/useHeroImage';
import { HeroImage as HeroImageComponent } from '@/components/ui/GlobalImage';
import { useTranslation } from 'react-i18next';

const HeroImage = () => {
  const { t } = useTranslation('pages');
  const { heroImageData, isLoading } = useHeroImage();

  // Render default image immediately while loading data
  if (isLoading) {
    return (
      <div
        className="group relative rounded-lg overflow-hidden shadow-lg"
        style={{ contain: 'layout style paint' }}
      >
        <div className="bg-muted" style={{ aspectRatio: '4 / 5' }}>
          {/* Show default image immediately to optimize LCP */}
          <HeroImageComponent
            src="/assets/images/home_page_image.webp"
            alt={t('home.heroImage.alt')}
            className="object-cover w-full h-full rounded-lg"
            fallbackText={t('home.heroImage.fallback')}
            preload={true}
            showLoadingSpinner={false}
            showRetryButton={false}
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent rounded-lg" />

        {/* Default content overlay */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50">
            <p className="text-sm font-medium text-foreground mb-1">
              {t('home.heroImage.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('home.heroImage.subtitle')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-lg overflow-hidden shadow-lg"
      style={{ contain: 'layout style paint' }}
    >
      <div className="bg-muted" style={{ aspectRatio: '4 / 5' }}>
        {/* Main hero image with advanced loading and fallback */}
        <HeroImageComponent
          src={heroImageData.imageUrl}
          alt={heroImageData.altText}
          className="object-cover w-full h-full rounded-lg"
          fallbackText={t('home.heroImage.fallback')}
          preload={true}
          showLoadingSpinner={true}
          showRetryButton={false}
        />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent rounded-lg" />

      {/* Hover hint text */}
      <div className="absolute top-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out">
        <div className="bg-foreground/60 text-background px-4 py-2 rounded-lg backdrop-blur-sm">
          <p className="text-sm font-medium">{heroImageData.altText}</p>
        </div>
      </div>

      {/* Content overlay - fades on hover */}
      <div className="absolute bottom-6 left-6 right-6 group-hover:opacity-0 transition-opacity duration-700 ease-in-out">
        <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50">
          <p className="text-sm font-medium text-foreground mb-1">
            {heroImageData.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {heroImageData.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroImage;
