import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchActiveArtisansFullWithTranslations,
  type ArtisanFullJoinRow as ArtisanJoinRow,
} from '@/services/artisansApi';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageFooter from '@/components/PageFooter';

type ArtisanView = {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  bio_short: string | null;
  region: string | null;
  location: string | null;
  experience_years: number | null;
  specialty: string | null;
  techniques: string[] | null;
  quote: string | null;
};

function resolveArtisan(row: ArtisanJoinRow, locale: string): ArtisanView {
  const tr = row.artisan_translations?.find((t) => t.locale === locale);
  return {
    id: row.id,
    name: row.name,
    photo_url: row.photo_url,
    bio: tr?.bio || row.bio,
    bio_short: tr?.bio_short || row.bio_short,
    region: row.region,
    location: row.location,
    experience_years: row.experience_years,
    specialty: tr?.specialty || row.specialty,
    techniques: row.techniques,
    quote: tr?.quote || row.quote,
  };
}

type ProcessStepKey = 'harvesting' | 'weaving' | 'shaping' | 'finishing';

const PROCESS_SLIDES: { key: ProcessStepKey; image: string }[] = [
  {
    key: 'harvesting',
    image: '/assets/images/artisans/process-harvesting.jpg',
  },
  {
    key: 'weaving',
    image: '/assets/images/artisans/process-weaving.jpg',
  },
  {
    key: 'shaping',
    image: '/assets/images/artisans/process-shaping.jpg',
  },
  {
    key: 'finishing',
    image: '/assets/images/artisans/process-finishing.jpg',
  },
];

// --- Intersection Observer hook for fade-in ---
function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('opacity-100', 'translate-y-0');
          el.classList.remove('opacity-0', 'translate-y-8');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function FadeInSection({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useFadeInOnScroll();
  return (
    <div
      ref={ref}
      className={`opacity-0 translate-y-8 transition-all duration-700 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

const ArtisansPage = () => {
  const { t, i18n } = useTranslation('pages');
  const locale = i18n.language?.startsWith('en') ? 'en' : 'fr';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: artisans = [], isLoading } = useQuery<ArtisanView[]>({
    queryKey: ['artisans-page', locale],
    queryFn: async () => {
      const rows = await fetchActiveArtisansFullWithTranslations();
      return rows.map((row) => resolveArtisan(row, locale));
    },
    staleTime: 5 * 60 * 1000,
  });

  const featured = artisans[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* ═══════════════════════════════════════════════════════
          HERO — Full-screen immersive
      ═══════════════════════════════════════════════════════ */}
      <section className="relative h-screen min-h-[700px] max-h-[1100px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/images/artisans/hero-rif-weaving.jpg"
            alt={t('artisans.heroImageAlt')}
            className="w-full h-full object-cover scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/70" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <p className="text-xs md:text-sm tracking-[0.35em] uppercase text-white/60 mb-6 font-light animate-fade-in">
            {t('artisans.hero.kicker')}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white font-bold tracking-wide leading-[1.1] mb-8 animate-fade-in">
            {t('artisans.hero.title1')}
            <br />
            <span className="italic font-normal text-white/90">
              {t('artisans.hero.title2')}
            </span>
          </h1>
          <div className="w-16 h-px bg-white/40 mx-auto mb-6" />
          <p className="text-base md:text-lg text-white/70 font-light tracking-wider max-w-xl mx-auto leading-relaxed animate-fade-in">
            {t('artisans.hero.subtitle')}
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-12 bg-white/30" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          STORYTELLING — Poetic split layout
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-40">
        <div className="container mx-auto px-4">
          <FadeInSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-28 items-center max-w-6xl mx-auto">
              <div className="overflow-hidden rounded-sm">
                <img
                  src="/assets/images/artisans/amazigh-woman.png"
                  alt={t('artisans.story.imageAlt')}
                  className="w-full aspect-[4/5] object-cover hover:scale-105 transition-transform duration-1000"
                  loading="lazy"
                />
              </div>
              <div className="space-y-10">
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-primary/70 mb-4 font-medium">
                    {t('artisans.story.kicker')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold leading-[1.15] tracking-wide">
                    {t('artisans.story.title1')}
                    <br />
                    <span className="italic font-normal text-foreground/80">
                      {t('artisans.story.title2')}
                    </span>
                  </h2>
                </div>
                <div className="w-16 h-px bg-primary/40" />
                <div className="space-y-6">
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {t('artisans.story.p1')}
                  </p>
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {t('artisans.story.p2')}
                  </p>
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {t('artisans.story.p3')}
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          ARTISANS GRID — Premium cards with 4:5 images
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-secondary/20">
        <div className="container mx-auto px-4">
          <FadeInSection>
            <div className="text-center mb-20 max-w-2xl mx-auto">
              <p className="text-xs tracking-[0.3em] uppercase text-primary/70 mb-4 font-medium">
                {t('artisans.grid.kicker')}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold tracking-wide mb-5">
                {t('artisans.grid.title')}
              </h2>
              <p className="text-muted-foreground text-lg font-light leading-relaxed">
                {t('artisans.grid.subtitle')}
              </p>
            </div>
          </FadeInSection>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
              {artisans.map((artisan, i) => (
                <FadeInSection key={artisan.id}>
                  <div
                    className="group cursor-default"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="overflow-hidden rounded-sm mb-6">
                      <img
                        src={artisan.photo_url || '/placeholder.svg'}
                        alt={t('artisans.grid.portraitAlt', {
                          name: artisan.name,
                        })}
                        className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                        loading="lazy"
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-serif text-2xl md:text-3xl text-foreground font-semibold tracking-wide group-hover:text-primary transition-colors duration-500">
                        {artisan.name}
                      </h3>

                      <div className="flex items-center gap-4 flex-wrap">
                        {artisan.region && (
                          <span className="text-xs tracking-[0.2em] uppercase text-primary/80 font-medium flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" />
                            {artisan.location || artisan.region}
                          </span>
                        )}
                        {artisan.experience_years != null && (
                          <span className="text-xs tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('artisans.years', {
                              count: artisan.experience_years,
                            })}
                          </span>
                        )}
                      </div>

                      {artisan.specialty && (
                        <p className="text-sm text-muted-foreground italic">
                          {artisan.specialty}
                        </p>
                      )}

                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                        {artisan.bio_short || artisan.bio}
                      </p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURED ARTISAN — Magazine split layout
      ═══════════════════════════════════════════════════════ */}
      {featured && (
        <section className="py-0">
          <FadeInSection>
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
              <div className="h-[450px] lg:h-auto overflow-hidden">
                <img
                  src={featured.photo_url || '/placeholder.svg'}
                  alt={t('artisans.featuredImageAlt', {
                    name: featured.name,
                    specialty: featured.specialty ?? '',
                  })}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="bg-card flex items-center">
                <div className="p-10 md:p-16 lg:p-20 space-y-8 max-w-xl">
                  <p className="text-xs tracking-[0.3em] uppercase text-primary/70 font-medium">
                    {t('artisans.featured.kicker')}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold leading-tight tracking-wide">
                    {featured.name}
                  </h2>
                  <div className="w-12 h-px bg-primary/40" />

                  {featured.quote && (
                    <div className="relative pl-8">
                      <Quote className="absolute top-0 left-0 w-6 h-6 text-primary/20" />
                      <p className="text-muted-foreground text-lg leading-[1.8] italic font-light">
                        &ldquo;{featured.quote}&rdquo;
                      </p>
                    </div>
                  )}

                  <p className="text-muted-foreground leading-[1.8] font-light">
                    {featured.bio}
                  </p>

                  {featured.experience_years != null && (
                    <p className="text-sm text-muted-foreground/70 flex items-center gap-2 tracking-wide">
                      <Clock className="w-4 h-4 text-primary/50" />
                      {t('artisans.featured.yearsExperience', {
                        count: featured.experience_years,
                      })}
                      {featured.location && ` — ${featured.location}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          PROCESS — 4 steps, editorial
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-secondary/20">
        <div className="container mx-auto px-4">
          <FadeInSection>
            <div className="text-center mb-20 max-w-2xl mx-auto">
              <p className="text-xs tracking-[0.3em] uppercase text-primary/70 mb-4 font-medium">
                {t('artisans.process.kicker')}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold tracking-wide mb-5">
                {t('artisans.process.title')}
              </h2>
              <p className="text-muted-foreground text-lg font-light leading-relaxed">
                {t('artisans.process.subtitle')}
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
            {PROCESS_SLIDES.map((slide, i) => (
              <FadeInSection key={slide.key}>
                <div className="group text-center">
                  <div className="relative mb-8 overflow-hidden rounded-sm">
                    <img
                      src={slide.image}
                      alt={t(`artisans.process.steps.${slide.key}.alt`)}
                      className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute top-5 left-5 w-9 h-9 rounded-full bg-background/90 text-foreground flex items-center justify-center text-sm font-serif font-semibold backdrop-blur-sm">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl text-foreground font-semibold mb-3 tracking-wide">
                    {t(`artisans.process.steps.${slide.key}.title`)}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-light">
                    {t(`artisans.process.steps.${slide.key}.description`)}
                  </p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CLOSING QUOTE
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36">
        <FadeInSection>
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="w-12 h-px bg-primary/30 mx-auto mb-10" />
            <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground/80 font-normal leading-[1.5] tracking-wide italic">
              {t('artisans.closingQuote')}
            </p>
            <div className="w-12 h-px bg-primary/30 mx-auto mt-10" />
          </div>
        </FadeInSection>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA — Discover the collection
      ═══════════════════════════════════════════════════════ */}
      <section className="py-28 md:py-36 bg-primary text-primary-foreground">
        <FadeInSection>
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <p className="text-xs tracking-[0.3em] uppercase text-primary-foreground/50 mb-6 font-medium">
              {t('artisans.cta.kicker')}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wide mb-6 leading-tight">
              {t('artisans.cta.title')}
            </h2>
            <p className="text-primary-foreground/70 text-lg font-light leading-relaxed mb-10 max-w-xl mx-auto">
              {t('artisans.cta.body')}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-none px-10 py-6 text-sm tracking-[0.15em] uppercase font-medium"
            >
              <Link to="/products">
                {t('artisans.cta.button')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </FadeInSection>
      </section>

      <PageFooter />
    </div>
  );
};

export default ArtisansPage;
