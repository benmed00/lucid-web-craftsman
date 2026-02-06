import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, MapPin, Clock, Heart } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from "@/components/ui/skeleton";

interface Artisan {
  id: string;
  name: string;
  specialty: string | null;
  photo_url: string | null;
  region: string | null;
  experience_years: number | null;
  bio_short: string | null;
  quote: string | null;
}

const ArtisansSection = () => {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const currentLocale = i18n.language?.split('-')[0] || 'fr';

  // Fetch artisans directly from the artisans table
  const { data: artisans = [], isLoading } = useQuery({
    queryKey: ['artisans', currentLocale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artisans')
        .select(`
          id,
          name,
          specialty,
          photo_url,
          region,
          experience_years,
          bio_short,
          quote,
          artisan_translations!left (
            specialty,
            quote,
            bio_short
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(4);

      if (error) {
        console.error('Error fetching artisans:', error);
        return [];
      }

      // Map with translation fallback
      return (data || []).map((artisan: any) => {
        const translation = artisan.artisan_translations?.find(
          (t: any) => t.locale === currentLocale
        );
        return {
          ...artisan,
          specialty: translation?.specialty || artisan.specialty,
          quote: translation?.quote || artisan.quote,
          bio_short: translation?.bio_short || artisan.bio_short,
        };
      }) as Artisan[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-20 w-full max-w-xl mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (artisans.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-2">
            <Heart className="w-3 h-3 mr-2 inline" />
            {t('pages:home.artisans.badge', 'Les mains derrière l\'art')}
          </Badge>
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
            {t('pages:home.artisans.title', 'Nos Artisans')}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {t('pages:home.artisans.description', 'Découvrez les artisans talentueux qui perpétuent un savoir-faire ancestral dans les montagnes du Rif marocain.')}
          </p>
        </div>

        {/* Artisans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {artisans.map((artisan, index) => (
            <Card 
              key={artisan.id}
              className="group bg-card border-none shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden rounded-2xl hover-lift"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Artisan Image */}
                  <div className="relative w-full sm:w-2/5 h-48 sm:h-auto min-h-[200px] overflow-hidden">
                    <img 
                      src={artisan.photo_url || '/placeholder.svg'} 
                      alt={`Portrait de ${artisan.name}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={400}
                      fetchPriority="low"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-gradient-to-r" />
                    
                    {/* Location Badge - Mobile */}
                    <div className="absolute bottom-3 left-3 sm:hidden">
                      <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur-sm">
                        <MapPin className="w-3 h-3 mr-1" />
                        {artisan.region || 'Rif, Maroc'}
                      </Badge>
                    </div>
                  </div>

                  {/* Artisan Info */}
                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
                    <div>
                      {/* Name & Location */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-serif text-xl md:text-2xl text-foreground group-hover:text-primary transition-colors duration-300">
                            {artisan.name}
                          </h3>
                          <p className="text-sm text-muted-foreground hidden sm:block">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {artisan.region || 'Rif, Maroc'}
                          </p>
                        </div>
                        {artisan.experience_years && (
                          <Badge variant="outline" className="text-xs hidden sm:flex">
                            <Clock className="w-3 h-3 mr-1" />
                            {artisan.experience_years} {t('common:years', 'ans')}
                          </Badge>
                        )}
                      </div>

                      {/* Specialty */}
                      {artisan.specialty && (
                        <Badge className="mb-4 bg-primary/10 text-primary text-xs">
                          {artisan.specialty}
                        </Badge>
                      )}

                      {/* Quote */}
                      {artisan.quote && (
                        <div className="relative">
                          <Quote className="absolute -top-1 -left-1 w-6 h-6 text-primary/20" />
                          <p className="text-sm md:text-base text-muted-foreground italic pl-5 leading-relaxed line-clamp-3">
                            {artisan.quote}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Experience - Mobile */}
                    {artisan.experience_years && (
                      <div className="mt-4 pt-3 border-t border-border/50 sm:hidden">
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {artisan.experience_years} {t('common:years', 'ans')} d'expérience
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('pages:home.artisans.cta', 'Chaque achat soutient directement ces artisans et leurs familles, préservant un patrimoine culturel unique.')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ArtisansSection;