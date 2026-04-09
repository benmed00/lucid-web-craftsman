import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageFooter from '@/components/PageFooter';

// --- Types ---
type ArtisanRow = Database['public']['Tables']['artisans']['Row'];
type ArtisanTranslation = Pick<
  Database['public']['Tables']['artisan_translations']['Row'],
  'locale' | 'specialty' | 'quote' | 'bio_short' | 'bio'
>;

type ArtisanJoinRow = ArtisanRow & {
  artisan_translations: ArtisanTranslation[] | null;
};

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

const PROCESS_STEPS = [
  {
    title: 'Harvesting',
    titleFr: 'Récolte',
    description:
      'Raw straw is carefully selected and harvested by hand from the Rif mountains during peak season.',
    descriptionFr:
      'La paille brute est soigneusement sélectionnée et récoltée à la main dans les montagnes du Rif.',
    image: '/assets/images/artisans/process-harvesting.jpg',
    alt: 'Hands harvesting golden straw stalks in Morocco\'s Rif mountains',
    altFr: 'Mains récoltant des tiges de paille dorée dans les montagnes du Rif au Maroc',
  },
  {
    title: 'Weaving',
    titleFr: 'Tissage',
    description:
      'Each strand is braided using techniques passed down through generations of Moroccan artisans.',
    descriptionFr:
      'Chaque brin est tressé selon des techniques transmises de génération en génération par les artisans marocains.',
    image: '/assets/images/artisans/process-weaving.jpg',
    alt: 'Skilled hands braiding natural straw fibers into intricate patterns',
    altFr: 'Mains habiles tressant des fibres de paille naturelle en motifs complexes',
  },
  {
    title: 'Shaping',
    titleFr: 'Mise en forme',
    description:
      'Artisans mold every piece by hand, giving each hat its unique silhouette and character.',
    descriptionFr:
      'Les artisans façonnent chaque pièce à la main, lui donnant sa silhouette unique.',
    image: '/assets/images/artisans/process-shaping.jpg',
    alt: 'Artisan hands shaping a straw hat on a wooden form',
    altFr: 'Mains d\'artisan façonnant un chapeau de paille sur une forme en bois',
  },
  {
    title: 'Finishing',
    titleFr: 'Finition',
    description:
      'Final touches — trimming, steaming, and quality checks — ensure every piece meets our standards.',
    descriptionFr:
      'Les touches finales — coupe, vapeur et contrôle qualité — garantissent l\'excellence.',
    image: '/assets/images/artisans/process-finishing.jpg',
    alt: 'Final quality inspection of a handmade straw hat with scissors and steam',
    altFr: 'Inspection finale d\'un chapeau de paille artisanal avec ciseaux et vapeur',
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
  const { t, i18n } = useTranslation(['pages', 'common']);
  const locale = i18n.language?.split('-')[0] ?? 'fr';
  const isFr = locale === 'fr';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: artisans = [], isLoading } = useQuery<ArtisanView[]>({
    queryKey: ['artisans-page', locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artisans')
        .select(`
          *,
          artisan_translations!left (
            locale, specialty, quote, bio_short, bio
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as ArtisanJoinRow[]).map((row) => resolveArtisan(row, locale));
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
            alt="Artisan hands weaving straw in the Rif mountains"
            className="w-full h-full object-cover scale-105"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/70" />
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <p className="text-xs md:text-sm tracking-[0.35em] uppercase text-white/60 mb-6 font-light animate-fade-in">
            {isFr ? 'Artisanat authentique du Maroc' : 'Authentic Moroccan Craftsmanship'}
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-white font-bold tracking-wide leading-[1.1] mb-8 animate-fade-in">
            {isFr ? 'Façonné à la Main,' : 'Crafted by Hands,'}
            <br />
            <span className="italic font-normal text-white/90">
              {isFr ? 'Enraciné dans l\'Héritage' : 'Rooted in Heritage'}
            </span>
          </h1>
          <div className="w-16 h-px bg-white/40 mx-auto mb-6" />
          <p className="text-base md:text-lg text-white/70 font-light tracking-wider max-w-xl mx-auto leading-relaxed animate-fade-in">
            {isFr
              ? 'Rencontrez les artisans derrière chaque création Rif Raw Straw'
              : 'Meet the artisans behind every Rif Raw Straw creation'}
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
                  alt="Portrait of an Amazigh artisan woman"
                  className="w-full aspect-[4/5] object-cover hover:scale-105 transition-transform duration-1000"
                  loading="lazy"
                />
              </div>
              <div className="space-y-10">
                <div>
                  <p className="text-xs tracking-[0.3em] uppercase text-primary/70 mb-4 font-medium">
                    {isFr ? 'Notre histoire' : 'Our Story'}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold leading-[1.15] tracking-wide">
                    {isFr ? 'Une tradition' : 'A Tradition'}
                    <br />
                    <span className="italic font-normal text-foreground/80">
                      {isFr ? 'à préserver' : 'Worth Preserving'}
                    </span>
                  </h2>
                </div>
                <div className="w-16 h-px bg-primary/40" />
                <div className="space-y-6">
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {isFr
                      ? 'Du Rif à Essaouira, de Fès à Marrakech — un artisanat ancestral perdure à travers le Maroc.'
                      : 'From the Rif to Essaouira, from Fès to Marrakech — an ancestral craft lives on across Morocco.'}
                  </p>
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {isFr
                      ? 'Chaque matière — paille, doum, raphia, fil de soie — est travaillée à la main selon des techniques transmises de génération en génération.'
                      : 'Each material — straw, doum palm, raphia, silk thread — is worked by hand using techniques passed down through generations.'}
                  </p>
                  <p className="text-muted-foreground text-lg leading-[1.8] font-light">
                    {isFr
                      ? 'Chez Rif Raw Straw, chaque achat soutient directement ces artisans et aide à préserver un patrimoine vivant.'
                      : 'At Rif Raw Straw, every purchase directly supports these artisans and helps preserve a living heritage.'}
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
                {isFr ? 'Les mains derrière l\'art' : 'The Hands Behind the Art'}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold tracking-wide mb-5">
                {isFr ? 'Nos Artisans' : 'Meet Our Artisans'}
              </h2>
              <p className="text-muted-foreground text-lg font-light leading-relaxed">
                {isFr
                  ? 'Les mains talentueuses qui façonnent chaque pièce de notre collection.'
                  : 'The talented hands shaping every piece in our collection.'}
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
                    {/* Image */}
                    <div className="overflow-hidden rounded-sm mb-6">
                      <img
                        src={artisan.photo_url || '/placeholder.svg'}
                        alt={`Portrait of ${artisan.name}`}
                        className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
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
                        {artisan.experience_years && (
                          <span className="text-xs tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {artisan.experience_years} {isFr ? 'ans' : 'years'}
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
              {/* Image side — edge-to-edge */}
              <div className="h-[450px] lg:h-auto overflow-hidden">
                <img
                  src={featured.photo_url || '/placeholder.svg'}
                  alt={`${featured.name}, ${featured.specialty}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content side */}
              <div className="bg-card flex items-center">
                <div className="p-10 md:p-16 lg:p-20 space-y-8 max-w-xl">
                  <p className="text-xs tracking-[0.3em] uppercase text-primary/70 font-medium">
                    {isFr ? 'Artisan à l\'honneur' : 'Featured Artisan'}
                  </p>
                  <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold leading-tight tracking-wide">
                    {featured.name}
                  </h2>
                  <div className="w-12 h-px bg-primary/40" />

                  {featured.quote && (
                    <div className="relative pl-8">
                      <Quote className="absolute top-0 left-0 w-6 h-6 text-primary/20" />
                      <p className="text-muted-foreground text-lg leading-[1.8] italic font-light">
                        "{featured.quote}"
                      </p>
                    </div>
                  )}

                  <p className="text-muted-foreground leading-[1.8] font-light">
                    {featured.bio}
                  </p>

                  {featured.experience_years && (
                    <p className="text-sm text-muted-foreground/70 flex items-center gap-2 tracking-wide">
                      <Clock className="w-4 h-4 text-primary/50" />
                      {featured.experience_years} {isFr ? 'ans d\'expérience' : 'years of experience'}
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
                {isFr ? 'Savoir-faire' : 'Craftsmanship'}
              </p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-foreground font-semibold tracking-wide mb-5">
                {isFr ? 'Le Processus' : 'The Making Process'}
              </h2>
              <p className="text-muted-foreground text-lg font-light leading-relaxed">
                {isFr
                  ? 'De la matière brute au chef-d\'œuvre — chaque étape faite à la main.'
                  : 'From raw material to finished masterpiece — every step done by hand.'}
              </p>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-6xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <FadeInSection key={step.title}>
                <div className="group text-center">
                  <div className="relative mb-8 overflow-hidden rounded-sm">
                    <img
                      src={step.image}
                      alt={isFr ? step.altFr : step.alt}
                      className="w-full aspect-[4/5] object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                      loading="lazy"
                    />
                    <div className="absolute top-5 left-5 w-9 h-9 rounded-full bg-background/90 text-foreground flex items-center justify-center text-sm font-serif font-semibold backdrop-blur-sm">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl text-foreground font-semibold mb-3 tracking-wide">
                    {isFr ? step.titleFr : step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed font-light">
                    {isFr ? step.descriptionFr : step.description}
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
              {isFr
                ? '"Chaque pièce porte une histoire, une culture, une main."'
                : '"Every piece carries a story, a culture, a hand."'}
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
              {isFr ? 'Soutenez l\'artisanat' : 'Support the Craft'}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wide mb-6 leading-tight">
              {isFr ? 'Découvrez la Collection' : 'Discover the Collection'}
            </h2>
            <p className="text-primary-foreground/70 text-lg font-light leading-relaxed mb-10 max-w-xl mx-auto">
              {isFr
                ? 'Chaque achat soutient directement ces artisans et leurs familles, préservant un patrimoine culturel unique.'
                : 'Every purchase directly supports these artisans and their families, preserving a unique cultural heritage.'}
            </p>
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 rounded-none px-10 py-6 text-sm tracking-[0.15em] uppercase font-medium"
            >
              <Link to="/products">
                {isFr ? 'Voir la collection' : 'Shop the Collection'}
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
