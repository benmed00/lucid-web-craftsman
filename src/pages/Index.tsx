import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Leaf, Instagram, Star, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Link } from 'react-router-dom';
import HeroImage from '@/components/HeroImage';
import ScrollToTop from '@/components/ScrollToTop';
import FloatingCartButton from '@/components/ui/FloatingCartButton';
import { lazy, Suspense } from 'react';
import SEOHelmet from '@/components/seo/SEOHelmet';
import { Skeleton } from '@/components/ui/skeleton';

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

  const sectionConfig = {
    showRecentlyViewed: false,
    showRecommendations: false,
    showProductShowcase: true,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <main id="main-content" className="flex-grow">
        {/* ──── HERO SECTION ──── */}
        <section className="relative overflow-hidden">
          {/* Background wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-sand-100 dark:from-sand-900 dark:via-background dark:to-sand-800" />
          
          <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-28">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
              {/* Left: Copy */}
              <div className="lg:w-1/2 w-full text-center lg:text-left space-y-6 sm:space-y-8 order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 bg-primary/8 border border-primary/15 rounded-full px-4 py-2 text-xs sm:text-sm font-medium tracking-widest uppercase text-primary animate-fade-in">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  {t('pages:home.hero.badge')}
                </div>

                <h1 className="text-[30px] sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-serif font-bold text-foreground animate-fade-in-up leading-[1.08] tracking-tight">
                  {t('pages:home.hero.title')}{' '}
                  <span className="text-primary italic">
                    {t('pages:home.hero.titleHighlight')}
                  </span>
                </h1>

                <p
                  className="text-base sm:text-lg md:text-xl text-muted-foreground animate-fade-in-up leading-relaxed max-w-lg mx-auto lg:mx-0"
                  style={{ animationDelay: '0.2s' }}
                >
                  {t('pages:home.hero.description')}
                </p>

                {/* CTAs */}
                <div
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up justify-center lg:justify-start pt-2"
                  style={{ animationDelay: '0.4s' }}
                >
                  <Link to="/products" className="group w-full sm:w-auto">
                    <Button
                      className="w-full sm:w-auto bg-foreground hover:bg-foreground/90 text-background font-semibold px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all duration-300 hover:shadow-xl text-sm sm:text-base touch-manipulation min-h-[52px] tracking-wide uppercase"
                      id="hero-discover-collection"
                    >
                      {t('pages:home.hero.discoverButton')}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link to="/story" className="group w-full sm:w-auto">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto border-2 border-foreground/15 text-foreground hover:bg-foreground/5 hover:border-foreground/30 px-8 sm:px-10 py-5 sm:py-6 rounded-full transition-all duration-300 text-sm sm:text-base touch-manipulation min-h-[52px] tracking-wide uppercase"
                      id="hero-our-story"
                    >
                      {t('pages:home.hero.storyButton')}
                    </Button>
                  </Link>
                </div>

                {/* Social proof */}
                <div
                  className="flex items-center gap-4 justify-center lg:justify-start animate-fade-in-up pt-4"
                  style={{ animationDelay: '0.6s' }}
                >
                  <div className="flex -space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-rating-star text-rating-star" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    4.9/5 · 200+ {t('common:trust.happyCustomers', 'clients satisfaits')}
                  </span>
                </div>
              </div>

              {/* Right: Hero image */}
              <div className="lg:w-1/2 w-full order-1 lg:order-2 animate-fade-in">
                <div className="max-w-sm sm:max-w-md mx-auto lg:max-w-none">
                  <HeroImage />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──── TRUST BAR ──── */}
        <div className="border-y border-border bg-card/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center md:justify-between items-center gap-6 md:gap-8 py-4 md:py-5">
              {[
                { icon: Truck, text: t('common:trust.freeShipping', 'Livraison offerte dès 50€') },
                { icon: RotateCcw, text: t('common:trust.returns', 'Retours gratuits 14j') },
                { icon: ShieldCheck, text: t('common:trust.securePayment', 'Paiement sécurisé') },
                { icon: Leaf, text: t('common:trust.handmade', '100% fait main') },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="whitespace-nowrap font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ──── VALUES SECTION ──── */}
        <section id="about" className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center mb-12 md:mb-16">
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">
                {t('pages:home.features.badge')}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
                {t('pages:home.features.title')}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {t('pages:home.features.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  icon: <Leaf className="h-6 w-6" />,
                  title: t('pages:home.features.eco.title'),
                  desc: t('pages:home.features.eco.description'),
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  ),
                  title: t('pages:home.features.craft.title'),
                  desc: t('pages:home.features.craft.description'),
                },
                {
                  icon: (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 1 1 2 2h-2zm0 0V5.5A2.5 2.5 0 1 0 9.5 8H12zm-7 4h14M5 12a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                    </svg>
                  ),
                  title: t('pages:home.features.design.title'),
                  desc: t('pages:home.features.design.description'),
                },
              ].map((feature, i) => (
                <Card
                  key={i}
                  className="bg-card border border-border/50 shadow-sm hover:shadow-elegant transition-all duration-500 p-8 group rounded-2xl"
                >
                  <CardContent className="p-0 text-center">
                    <div className="h-14 w-14 bg-secondary rounded-2xl flex items-center justify-center mb-6 mx-auto text-primary transition-transform duration-300 group-hover:scale-105">
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-serif text-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ──── PRODUCT SHOWCASE ──── */}
        <Suspense fallback={<SectionFallback />}>
          <section id="shop" className="bg-secondary/50 py-16 md:py-24 lg:py-32">
            <div className="container mx-auto px-4">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 md:mb-14 gap-6">
                <div className="max-w-2xl text-center lg:text-left">
                  <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">
                    {t('pages:home.products.badge')}
                  </span>
                  <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
                    {t('pages:home.products.title')}
                  </h2>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {t('pages:home.products.description')}
                  </p>
                </div>
                <Link
                  to="/products"
                  className="hidden lg:flex items-center text-foreground hover:text-primary transition-all duration-300 font-medium group text-sm tracking-wide uppercase"
                >
                  <span>{t('pages:home.products.viewAll')}</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
              <ProductShowcase />

              {sectionConfig.showRecentlyViewed && (
                <Suspense fallback={null}>
                  <div className="mt-12 md:mt-16">
                    <RecentlyViewedProducts />
                  </div>
                </Suspense>
              )}

              <div className="mt-12 text-center lg:hidden">
                <Link to="/products" className="group">
                  <Button
                    variant="outline"
                    className="border-2 border-foreground/15 text-foreground hover:bg-foreground/5 px-8 py-4 rounded-full font-medium transition-all duration-300 text-sm tracking-wide uppercase touch-manipulation min-h-[48px]"
                    id="mobile-view-all-products"
                  >
                    {t('pages:home.products.viewAllMobile')}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </Suspense>

        {/* ──── ARTISANS ──── */}
        <Suspense fallback={<SectionFallback />}>
          <ArtisansSection />
        </Suspense>

        {/* ──── TESTIMONIALS ──── */}
        <Suspense fallback={<SectionFallback />}>
          <section id="testimonials" className="bg-secondary/30 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
                <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">
                  {t('pages:home.testimonials.badge')}
                </span>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground">
                  {t('pages:home.testimonials.title')}
                </h2>
              </div>
              <Testimonials />
            </div>
          </section>
        </Suspense>

        {/* ──── INSTAGRAM ──── */}
        <Suspense fallback={<SectionFallback />}>
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center mb-10 md:mb-14">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Instagram className="h-4 w-4 text-foreground" />
                  <span className="text-xs font-medium tracking-[0.2em] uppercase text-foreground">
                    {t('pages:home.instagram.follow')}
                  </span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground">
                  {t('pages:home.instagram.title')}
                </h2>
              </div>
              <InstagramFeed />
            </div>
          </section>
        </Suspense>

        {/* ──── NEWSLETTER ──── */}
        <Suspense fallback={<SectionFallback />}>
          <section className="bg-secondary/30 py-16 md:py-24">
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
