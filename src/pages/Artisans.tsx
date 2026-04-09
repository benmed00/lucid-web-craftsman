import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, Quote } from 'lucide-react';
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
    image: '/assets/images/artisans/weaving-hands.png',
  },
  {
    title: 'Weaving',
    titleFr: 'Tissage',
    description:
      'Each strand is braided using techniques passed down through generations of Rifian women.',
    descriptionFr:
      'Chaque brin est tressé selon des techniques transmises de génération en génération.',
    image: '/assets/images/artisans/straw-texture.png',
  },
  {
    title: 'Shaping',
    titleFr: 'Mise en forme',
    description:
      'Artisans mold every piece by hand, giving each hat its unique silhouette and character.',
    descriptionFr:
      'Les artisans façonnent chaque pièce à la main, lui donnant sa silhouette unique.',
    image: '/assets/images/artisans/straw-bags-market.png',
  },
  {
    title: 'Finishing',
    titleFr: 'Finition',
    description:
      'Final touches — trimming, steaming, and quality checks — ensure every piece meets our standards.',
    descriptionFr:
      'Les touches finales — coupe, vapeur et contrôle qualité — garantissent l\'excellence.',
    image: '/assets/images/artisans/fibres-naturelles.png',
  },
];

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

  // Pick the first artisan as featured
  const featured = artisans[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/assets/images/artisans/hero-rif-weaving.jpg"
            alt="Artisan hands weaving straw in the Rif mountains"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-bold tracking-wide leading-tight mb-6">
            {isFr ? 'Façonné à la main,' : 'Crafted by Hands,'}
            <br />
            {isFr ? 'Enraciné dans l\'héritage' : 'Rooted in Heritage'}
          </h1>
          <p className="text-lg md:text-xl text-white/80 font-light tracking-wider max-w-2xl mx-auto">
            {isFr
              ? 'Découvrez les artisans derrière Rif Raw Straw'
              : 'Discover the artisans behind Rif Raw Straw'}
          </p>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center max-w-6xl mx-auto">
            <div className="overflow-hidden rounded-sm">
              <img
                src="/assets/images/artisans/amazigh-woman.png"
                alt="Portrait of an Amazigh artisan woman"
                className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
            </div>
            <div className="space-y-8">
              <h2 className="font-serif text-3xl md:text-5xl text-foreground font-semibold leading-tight tracking-wide">
                {isFr ? 'Une tradition' : 'A Tradition'}
                <br />
                {isFr ? 'à préserver' : 'Worth Preserving'}
              </h2>
              <div className="w-16 h-px bg-primary" />
              <p className="text-muted-foreground text-lg leading-relaxed">
                {isFr
                  ? 'Dans les montagnes du Rif marocain, un artisanat centenaire perdure grâce aux mains habiles d\'artisans passionnés. Chaque brin de paille est récolté, préparé et tissé selon des techniques transmises de génération en génération par les femmes amazighes.'
                  : 'In the mountains of Morocco\'s Rif region, a centuries-old craft lives on through the hands of skilled artisans. Each piece of straw is harvested, prepared, and woven using techniques passed down through generations of Amazigh women.'}
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {isFr
                  ? 'Chez Rif Raw Straw, nous ne vendons pas seulement des chapeaux — nous perpétuons un patrimoine vivant. Chaque achat soutient directement ces familles d\'artisans et aide à préserver une tradition culturelle menacée de disparition.'
                  : 'At Rif Raw Straw, we don\'t just sell hats — we carry forward a living heritage. Every purchase directly supports these artisan families and helps preserve a cultural tradition at risk of disappearing.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ARTISANS GRID — from Supabase */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold tracking-wide mb-4">
              {isFr ? 'Nos Artisans' : 'Meet Our Artisans'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isFr
                ? 'Les mains talentueuses qui façonnent chaque pièce de notre collection.'
                : 'The talented hands shaping every piece in our collection.'}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[450px] rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {artisans.map((artisan, i) => (
                <div
                  key={artisan.id}
                  className="group bg-card rounded-sm overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-500"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className="overflow-hidden h-80">
                    <img
                      src={artisan.photo_url || '/placeholder.svg'}
                      alt={`Portrait of ${artisan.name}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 space-y-3">
                    <h3 className="font-serif text-xl text-foreground font-semibold">
                      {artisan.name}
                    </h3>
                    <div className="flex items-center gap-3 flex-wrap">
                      {artisan.region && (
                        <span className="text-sm text-primary font-medium tracking-wider uppercase flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {artisan.location || artisan.region}
                        </span>
                      )}
                      {artisan.experience_years && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {artisan.experience_years} {isFr ? 'ans' : 'years'}
                        </Badge>
                      )}
                    </div>
                    {artisan.specialty && (
                      <Badge className="bg-primary/10 text-primary text-xs border-none">
                        {artisan.specialty}
                      </Badge>
                    )}
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {artisan.bio_short || artisan.bio}
                    </p>
                    {artisan.techniques && artisan.techniques.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {artisan.techniques.map((tech) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FEATURED ARTISAN */}
      {featured && (
        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 max-w-6xl mx-auto overflow-hidden rounded-sm shadow-lg">
              <div className="h-[400px] lg:h-auto">
                <img
                  src={featured.photo_url || '/placeholder.svg'}
                  alt={`${featured.name}, ${featured.specialty}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-card p-10 md:p-16 flex flex-col justify-center space-y-6">
                <p className="text-xs text-primary font-semibold tracking-[0.2em] uppercase">
                  {isFr ? 'Artisan à l\'honneur' : 'Featured Artisan'}
                </p>
                <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold leading-tight">
                  {featured.name}
                </h2>
                <div className="w-12 h-px bg-primary" />
                {featured.quote && (
                  <div className="relative">
                    <Quote className="absolute -top-2 -left-2 w-8 h-8 text-primary/20" />
                    <p className="text-muted-foreground text-lg leading-relaxed italic pl-6">
                      "{featured.quote}"
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground leading-relaxed">
                  {featured.bio}
                </p>
                {featured.experience_years && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    {featured.experience_years} {isFr ? 'ans d\'expérience' : 'years of experience'}
                    {featured.location && ` — ${featured.location}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PROCESS SECTION */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl md:text-4xl text-foreground font-semibold tracking-wide mb-4">
              {isFr ? 'Le Processus de Fabrication' : 'The Making Process'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isFr
                ? 'De la matière brute au chef-d\'œuvre — chaque étape faite à la main.'
                : 'From raw material to finished masterpiece — every step done by hand.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="text-center group">
                <div className="relative mb-6 overflow-hidden rounded-sm aspect-[4/5]">
                  <img
                    src={step.image}
                    alt={isFr ? step.titleFr : step.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-serif text-lg text-foreground font-semibold mb-2">
                  {isFr ? step.titleFr : step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {isFr ? step.descriptionFr : step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING SECTION */}
      <section className="py-24 md:py-32" style={{ backgroundColor: '#FAF9F6' }}>
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="w-12 h-px bg-primary mx-auto mb-8" />
          <p className="font-serif text-2xl md:text-3xl lg:text-4xl text-foreground/90 font-medium leading-relaxed tracking-wide italic">
            {isFr
              ? '"Chaque pièce porte une histoire, une culture, une main."'
              : '"Every piece carries a story, a culture, a hand."'}
          </p>
          <div className="w-12 h-px bg-primary mx-auto mt-8" />
        </div>
      </section>

      <PageFooter />
    </div>
  );
};

export default ArtisansPage;
