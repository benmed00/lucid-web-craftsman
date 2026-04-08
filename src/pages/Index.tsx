// Index page — all sections render independently
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Leaf, Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Link } from 'react-router-dom';
import HeroImage from '@/components/HeroImage';
import ScrollToTop from '@/components/ScrollToTop';
import FloatingCartButton from '@/components/ui/FloatingCartButton';
import { lazy, Suspense } from 'react';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { Skeleton } from '@/components/ui/skeleton';
import { TrustBar } from '@/components/conversion/TrustBar';

// Lazy load below-fold sections to improve Speed Index
const Footer = lazy(() => import('@/components/Footer'));
const ProductShowcase = lazy(() => import('@/components/ProductShowcase'));
const Testimonials = lazy(() => import('@/components/Testimonials'));
const InstagramFeed = lazy(() => import('@/components/InstagramFeed'));
const ArtisansSection = lazy(() => import('@/components/ArtisansSection'));
const NewsletterSubscription = lazy(
  () => import('@/components/NewsletterSubscription')
);
const RecentlyViewedProducts = lazy(() =>
  import('@/components/RecentlyViewedProducts').then((m) => ({
    default: m.RecentlyViewedProducts,
  }))
);

const SectionFallback = () => (
  <div className="py-12 container mx-auto px-4">
    <Skeleton className="h-8 w-1/3 mx-auto mb-6" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const Index = () => {
  const { t } = useTranslation(['pages', 'common']);

  // All sections render independently — no phased gating

  // Configuration for showing/hiding sections - easily configurable for future
  const sectionConfig = {
    showRecentlyViewed: false,
    showRecommendations: false,
    showProductShowcase: true,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SEO Meta Tags */}
      <SEOHelmet
        title={t('pages:home.seo.title')}
        description={t('pages:home.seo.description')}
        keywords={[
          'artisanat marocain',
          'sacs fait main',
          'chapeaux paille',
          'rif',
          'artisan',
          'durable',
          'traditionnel',
          'berbère',
          'écologique',
        ]}
        url="/"
        type="website"
        image="/assets/images/home_page_image.webp"
      />

      {/* Navigation */}

      <main id="main-content" className="flex-grow">
        {/* Hero Section - Mobile-First Optimized */}
        <section
          className="container mx-auto px-4 sm:px-6 py-10 sm:py-14 md:py-16 lg:py-20 xl:py-28 flex flex-col lg:flex-row items-center gap-10 lg:gap-16"
          style={{ contain: 'layout style' }}
        >
          {/* Left: Copy and CTA */}
          <div className="lg:w-1/2 w-full text-center lg:text-left space-y-6 sm:space-y-8 hero-text-animation order-2 lg:order-1">
            <Badge className="inline-flex items-center bg-primary/10 text-primary hover:bg-primary/15 border-none animate-scale-in px-4 py-2 text-xs sm:text-sm font-medium tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 animate-pulse"></span>
              {t('pages:home.hero.badge')}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-serif font-semibold text-foreground animate-fade-in-up leading-[1.1] tracking-tight">
              {t('pages:home.hero.title')}{' '}
              <span className="text-primary">
                {t('pages:home.hero.titleHighlight')}
              </span>
            </h1>
            <p
              className="text-base sm:text-lg md:text-xl text-muted-foreground animate-fade-in-up leading-relaxed max-w-lg mx-auto lg:mx-0 font-sans"
              style={{ animationDelay: '0.3s' }}
            >
              {t('pages:home.hero.description')}
            </p>
            <div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up justify-center lg:justify-start pt-2"
              style={{ animationDelay: '0.5s' }}
            >
              <Link to="/products" className="group w-full sm:w-auto">
                <Button
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 sm:px-10 py-5 sm:py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg text-base sm:text-lg touch-manipulation min-h-[52px] sm:min-h-[56px] active:scale-[0.98] tracking-wide"
                  id="hero-discover-collection"
                  name="discover-collection-button"
                >
                  {t('pages:home.hero.discoverButton')}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/blog" className="group w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-primary/20 text-foreground hover:bg-primary/5 hover:border-primary/40 px-8 sm:px-10 py-5 sm:py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] text-base sm:text-lg touch-manipulation min-h-[52px] sm:min-h-[56px] active:scale-[0.98]"
                  id="hero-our-story"
                  name="our-story-button"
                >
                  {t('pages:home.hero.storyButton')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Hero image */}
          <div className="lg:w-1/2 w-full hero-image-animation order-1 lg:order-2">
            <div className="transition-all duration-500 max-w-sm sm:max-w-md mx-auto lg:max-w-none">
              <HeroImage />
            </div>
          </div>
        </section>

        {/* Trust Bar — below hero */}
        <TrustBar />

        {/* Features Section - Mobile Responsive */}
        <section id="about" className="bg-secondary py-12 md:py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-8 md:mb-16 lg:mb-20">
              <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-2">
                {t('pages:home.features.badge')}
              </Badge>
              <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl text-foreground mb-4 md:mb-6 leading-tight">
                {t('pages:home.features.title')}
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed px-4">
                {t('pages:home.features.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-12 stagger-animation">
              <Card className="bg-card border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-6 md:p-8 hover-glow group">
                <CardContent className="p-0">
                  <div className="h-14 w-14 md:h-16 md:w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Leaf className="h-7 w-7 md:h-8 md:w-8 text-primary transition-transform duration-300" />
                  </div>
                  <h3 className="text-lg md:text-xl font-serif text-foreground mb-3 md:mb-4 text-center transition-colors duration-300 group-hover:text-primary">
                    {t('pages:home.features.eco.title')}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground text-center leading-relaxed transition-colors duration-300 group-hover:text-foreground">
                    {t('pages:home.features.eco.description')}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-6 md:p-8 hover-glow group">
                <CardContent className="p-0">
                  <div className="h-14 w-14 md:h-16 md:w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg
                      className="h-7 w-7 md:h-8 md:w-8 text-primary transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-serif text-foreground mb-3 md:mb-4 text-center transition-colors duration-300 group-hover:text-primary">
                    {t('pages:home.features.craft.title')}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground text-center leading-relaxed transition-colors duration-300 group-hover:text-foreground">
                    {t('pages:home.features.craft.description')}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card border-none shadow-lg hover:shadow-xl hover-lift animate-fade-in-up transition-all duration-500 p-6 md:p-8 hover-glow group">
                <CardContent className="p-0">
                  <div className="h-14 w-14 md:h-16 md:w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <svg
                      className="h-7 w-7 md:h-8 md:w-8 text-primary transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg md:text-xl font-serif text-foreground mb-3 md:mb-4 text-center transition-colors duration-300 group-hover:text-primary">
                    {t('pages:home.features.design.title')}
                  </h3>
                  <p className="text-sm md:text-base text-muted-foreground text-center leading-relaxed transition-colors duration-300 group-hover:text-foreground">
                    {t('pages:home.features.design.description')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Product Showcase - Mobile Responsive */}
        <Suspense fallback={<SectionFallback />}>
          <section id="shop" className="py-16 md:py-20 lg:py-28">
            <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 md:mb-12 lg:mb-16 gap-6">
                <div className="max-w-2xl text-center lg:text-left">
                  <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-2">
                    {t('pages:home.products.badge')}
                  </Badge>
                  <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
                    {t('pages:home.products.title')}
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t('pages:home.products.description')}
                  </p>
                </div>
                <Link
                  to="/products"
                  className="hidden lg:flex items-center text-primary hover:text-primary/80 transition-all duration-300 font-medium group hover-underline icon-bounce"
                >
                  <span id="collection-link-desktop" className="cursor-pointer">
                    {t('pages:home.products.viewAll')}
                  </span>
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
              <ProductShowcase />

              {/* Recently Viewed Section - Hidden by default, configurable */}
              {sectionConfig.showRecentlyViewed && (
                <Suspense fallback={null}>
                  <div className="mt-12 md:mt-16">
                    <RecentlyViewedProducts />
                  </div>
                </Suspense>
              )}

              {/* Mobile CTA Button */}
              <div className="mt-12 text-center lg:hidden">
                <Link to="/products" className="group">
                  <Button
                    variant="outline"
                    className="border-2 border-border text-foreground hover:bg-muted hover:border-primary/50 px-6 md:px-8 py-4 rounded-lg font-medium transition-all duration-300 hover:scale-105 button-press hover-glow touch-manipulation min-h-[48px]"
                    id="mobile-view-all-products"
                    name="view-all-products-mobile"
                  >
                    {t('pages:home.products.viewAllMobile')}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </Suspense>

        {/* Artisans Section */}
        <Suspense fallback={<SectionFallback />}>
          <ArtisansSection />
        </Suspense>

        {/* Testimonials - Mobile Responsive */}
        <Suspense fallback={<SectionFallback />}>
          <section
            id="testimonials"
            className="bg-secondary py-12 md:py-20 lg:py-24"
          >
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
                <Badge className="mb-2 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                  {t('pages:home.testimonials.badge')}
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground">
                  {t('pages:home.testimonials.title')}
                </h2>
              </div>
              <Testimonials />
            </div>
          </section>
        </Suspense>

        {/* Instagram Section - Mobile Responsive */}
        <Suspense fallback={<SectionFallback />}>
          <section className="py-12 md:py-20 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center mb-8 md:mb-12">
                <div className="flex items-center justify-center mb-2">
                  <Instagram className="h-4 w-4 md:h-5 md:w-5 text-foreground mr-2" />
                  <span className="text-sm md:text-base text-foreground font-medium">
                    {t('pages:home.instagram.follow')}
                  </span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground">
                  {t('pages:home.instagram.title')}
                </h2>
              </div>
              <InstagramFeed />
            </div>
          </section>
        </Suspense>

        {/* Newsletter Section */}
        <Suspense fallback={<SectionFallback />}>
          <section className="bg-muted/50 dark:bg-muted/20 py-16 md:py-20">
            <div className="container mx-auto px-4">
              <div className="max-w-xl mx-auto">
                <NewsletterSubscription variant="inline" />
              </div>
            </div>
          </section>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <ScrollToTop />
      <FloatingCartButton />
    </div>
  );
};

export default Index;
