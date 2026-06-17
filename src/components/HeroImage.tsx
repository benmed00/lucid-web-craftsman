// Using native CSS aspect-ratio instead of Radix AspectRatio to avoid forced reflow
import { useState, useEffect } from 'react';
import { useHeroImage } from '@/hooks/useHeroImage';
import { HeroImage as HeroImageComponent } from '@/components/ui/GlobalImage';
import { useTranslation } from 'react-i18next';

const DEFAULT_HERO_URL = '/assets/images/home_page_image.webp';

const HeroImage = () => {
  const { t } = useTranslation('pages');
  const { heroImageData, hasFetchedRemote } = useHeroImage();

  // Is the currently selected image the local default (hat) or a real
  // DB-backed image? Anything other than the default WebP path is treated
  // as "remote" and gets the crossfade-in treatment.
  const isRemote = heroImageData.imageUrl !== DEFAULT_HERO_URL;

  // Tracks whether the remote <img> has finished decoding so we can fade it
  // in over the default image without any flash.
  const [remoteLoaded, setRemoteLoaded] = useState(false);

  // If the remote URL changes (admin updates hero), reset the fade state
  // so the new image fades in cleanly.
  useEffect(() => {
    setRemoteLoaded(false);
  }, [heroImageData.imageUrl]);

  // Once the remote image has been visible for a moment, we can safely stop
  // rendering the default image to free memory. Delay matches the fade.
  const [hideDefault, setHideDefault] = useState(false);
  useEffect(() => {
    if (!remoteLoaded) return;
    const timer = setTimeout(() => setHideDefault(true), 1200);
    return () => clearTimeout(timer);
  }, [remoteLoaded]);

  return (
    <div
      className="group relative rounded-lg overflow-hidden shadow-lg"
      style={{ contain: 'layout style paint' }}
    >
      <div
        className="relative bg-muted"
        style={{ aspectRatio: '4 / 5' }}
      >
        {/* Layer A — local default image. Acts as the LCP candidate and as
            a fallback while the deferred Supabase fetch is in flight.
            Removed from the DOM once the remote image has fully faded in. */}
        {!hideDefault && (
          <div className="absolute inset-0">
            <HeroImageComponent
              src={DEFAULT_HERO_URL}
              srcSet="/assets/images/home_page_image-480.webp 480w, /assets/images/home_page_image-768.webp 768w, /assets/images/home_page_image-1024.webp 1024w, /assets/images/home_page_image-1280.webp 1280w, /assets/images/home_page_image-1600.webp 1600w"
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt={t('home.heroImage.alt')}
              className="object-cover w-full h-full rounded-lg"
              fallbackText={t('home.heroImage.fallback')}
              preload={true}
              showLoadingSpinner={false}
              showRetryButton={false}
              width={800}
              height={1000}
            />
          </div>
        )}

        {/* Layer B — remote DB-backed image. Only rendered once the deferred
            Supabase fetch has resolved AND returned a non-default URL.
            Mounted with opacity-0, transitioned to opacity-100 on load for
            an elegant crossfade over the default image. */}
        {isRemote && hasFetchedRemote && (
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              remoteLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <HeroImageComponent
              src={heroImageData.imageUrl}
              alt={heroImageData.altText}
              className="object-cover w-full h-full rounded-lg"
              fallbackText={t('home.heroImage.fallback')}
              preload={true}
              showLoadingSpinner={false}
              showRetryButton={false}
              width={800}
              height={1000}
              onLoad={() => setRemoteLoaded(true)}
            />
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent rounded-lg pointer-events-none" />

      {/* Hover hint text — only meaningful once the real image is shown */}
      {remoteLoaded && (
        <div className="absolute top-6 left-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out">
          <div className="bg-foreground/60 text-background px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-sm font-medium">{heroImageData.altText}</p>
          </div>
        </div>
      )}

      {/* Content overlay — fades on hover */}
      <div className="absolute bottom-6 left-6 right-6 group-hover:opacity-0 transition-opacity duration-700 ease-in-out">
        <div className="bg-card/95 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg border border-border/50">
          <p className="text-sm font-medium text-foreground mb-1">
            {remoteLoaded
              ? heroImageData.title
              : t('home.heroImage.title')}
          </p>
          <p className="text-xs text-muted-foreground">
            {remoteLoaded
              ? heroImageData.subtitle
              : t('home.heroImage.subtitle')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HeroImage;
