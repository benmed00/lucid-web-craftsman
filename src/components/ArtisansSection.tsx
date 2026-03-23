import { useTranslation } from 'react-i18next';
import type { TFunction, i18n as I18nApi } from 'i18next';
import type { Dispatch, SetStateAction } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Quote,
  MapPin,
  Clock,
  Heart,
  AlertCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  QueryClient,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  useSafetyTimeout,
  type SafetyTimeoutReturn,
} from '@/hooks/useSafetyTimeout';
import { useState } from 'react';

// --- i18n -------------------------------------------------------------------

const I18N_NAMESPACES: string[] = ['pages', 'common'];
// --- Supabase row shapes (single source: generated Database) ---------------

/** Columns selected from `artisans` for this section */
type ArtisanRowPick = Pick<
  Database['public']['Tables']['artisans']['Row'],
  | 'id'
  | 'name'
  | 'specialty'
  | 'photo_url'
  | 'region'
  | 'experience_years'
  | 'bio_short'
  | 'quote'
>;

/** Nested join payload from PostgREST (must match `.select()` projection) */
type ArtisanTranslationJoined = Pick<
  Database['public']['Tables']['artisan_translations']['Row'],
  'locale' | 'specialty' | 'quote' | 'bio_short'
>;

/** Raw row shape returned by the join query before normalization */
type ArtisanJoinRow = ArtisanRowPick & {
  artisan_translations: ArtisanTranslationJoined[] | null;
};

/**
 * Flat view model for the UI: translation fields merged for `locale`,
 * join array stripped (not rendered).
 */
type ArtisanPublic = ArtisanRowPick;

// --- Query / UX constants ---------------------------------------------------

const ARTISANS_QUERY_ROOT: string = 'artisans';
type ArtisansQueryKey = readonly [typeof ARTISANS_QUERY_ROOT, string];

const DEFAULT_LOCALE: string = 'fr';
const STALE_TIME_MS: number = 5 * 60 * 1000;
const RETRY_COUNT: number = 1;
const RETRY_DELAY_MS: number = 2000;
const SAFETY_TIMEOUT_MS: number = 12000;
const SAFETY_SLOW_MS: number = 6000;
const RETRY_UI_RESET_MS: number = 500;

const SKELETON_PLACEHOLDERS: readonly [1, 2, 3, 4] = [1, 2, 3, 4];

// --- Data transfer: join row → public DTO -----------------------------------

function pickTranslationForLocale(
  rows: ArtisanTranslationJoined[] | null | undefined,
  locale: string
): ArtisanTranslationJoined | undefined {
  return rows?.find((row: ArtisanTranslationJoined) => row.locale === locale);
}

function joinRowToPublic(row: ArtisanJoinRow, locale: string): ArtisanPublic {
  const tr: ArtisanTranslationJoined | undefined = pickTranslationForLocale(
    row.artisan_translations,
    locale
  );
  return {
    id: row.id,
    name: row.name,
    photo_url: row.photo_url,
    region: row.region,
    experience_years: row.experience_years,
    specialty: tr?.specialty || row.specialty,
    quote: tr?.quote || row.quote,
    bio_short: tr?.bio_short || row.bio_short,
  };
}

interface ArtisansSectionProps {
  /** When false, the Supabase query is deferred to avoid Chrome connection pool saturation */
  enabled?: boolean;
}

const ArtisansSection = ({ enabled = true }: ArtisansSectionProps) => {
  const {
    t,
    i18n,
  }: {
    t: TFunction<typeof I18N_NAMESPACES>;
    i18n: I18nApi;
  } = useTranslation(I18N_NAMESPACES);

  const currentLocale: string = i18n.language?.split('-')[0] ?? DEFAULT_LOCALE;

  const queryClient: QueryClient = useQueryClient();

  const [isRetrying, setIsRetrying]: readonly [
    boolean,
    Dispatch<SetStateAction<boolean>>,
  ] = useState<boolean>(false);

  const queryKey: ArtisansQueryKey = [ARTISANS_QUERY_ROOT, currentLocale];

  const artisansQuery: UseQueryResult<ArtisanPublic[], Error> = useQuery<
    ArtisanPublic[],
    Error
  >({
    queryKey,
    enabled,
    queryFn: async (): Promise<ArtisanPublic[]> => {
      console.info('[ArtisansSection] queryFn CALLED, locale:', currentLocale);

      const supabaseResult: {
        data: ArtisanJoinRow[] | null;
        error: Error | null;
      } = await supabase
        .from('artisans')
        .select(
          `
          id,
          name,
          specialty,
          photo_url,
          region,
          experience_years,
          bio_short,
          quote,
          artisan_translations!left (
            locale,
            specialty,
            quote,
            bio_short
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(4);

      const { data, error }: { data: ArtisanJoinRow[] | null; error: unknown } =
        supabaseResult;

      if (error) {
        console.error('Error fetching artisans:', error);
        throw error;
      }

      const rows: ArtisanJoinRow[] = data ?? [];
      return rows.map((row: ArtisanJoinRow) =>
        joinRowToPublic(row, currentLocale)
      );
    },
    staleTime: STALE_TIME_MS,
    retry: RETRY_COUNT,
    retryDelay: RETRY_DELAY_MS,
    networkMode: 'always',
  });

  const artisans: ArtisanPublic[] = artisansQuery.data ?? [];
  const isLoading: boolean = artisansQuery.isLoading;
  const fetchError: Error | null = artisansQuery.error;

  const safetyTimeoutOptions: {
    timeout: number;
    slowThreshold: number;
  } = {
    timeout: SAFETY_TIMEOUT_MS,
    slowThreshold: SAFETY_SLOW_MS,
  };

  const safetyTimeout: SafetyTimeoutReturn = useSafetyTimeout(
    isLoading,
    safetyTimeoutOptions
  );
  const forceRender: boolean = safetyTimeout.hasTimedOut;

  if (isLoading && !forceRender) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-20 w-full max-w-xl mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {SKELETON_PLACEHOLDERS.map((i: 1 | 2 | 3 | 4) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const showError: boolean =
    Boolean(fetchError || (forceRender && isLoading)) && artisans.length === 0;

  if (showError) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            {t(
              'pages:home.artisans.loadError',
              'Impossible de charger les artisans.'
            )}
          </p>
          <Button
            variant="outline"
            onClick={async (): Promise<void> => {
              setIsRetrying(true);
              try {
                await queryClient.resetQueries({
                  queryKey: [ARTISANS_QUERY_ROOT],
                });
              } catch {
                /* handled by RQ */
              } finally {
                setTimeout((): void => {
                  setIsRetrying(false);
                }, RETRY_UI_RESET_MS);
              }
            }}
            disabled={isRetrying}
            className="gap-2"
          >
            {isRetrying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRetrying
              ? t('common:messages.loading', 'Chargement…')
              : t('common:buttons.retry')}
          </Button>
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
            {t('pages:home.artisans.badge', "Les mains derrière l'art")}
          </Badge>
          <h2 className="font-serif text-2xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
            {t('pages:home.artisans.title', 'Nos Artisans')}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {t(
              'pages:home.artisans.description',
              'Découvrez les artisans talentueux qui perpétuent un savoir-faire ancestral dans les montagnes du Rif marocain.'
            )}
          </p>
        </div>

        {/* Artisans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {artisans.map((artisan: ArtisanPublic, index: number) => (
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
                      {...{ fetchpriority: 'low' as const }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-gradient-to-r" />

                    {/* Location Badge - Mobile */}
                    <div className="absolute bottom-3 left-3 sm:hidden">
                      <Badge
                        variant="secondary"
                        className="bg-white/90 text-foreground backdrop-blur-sm"
                      >
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
                          <Badge
                            variant="outline"
                            className="text-xs hidden sm:flex"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {artisan.experience_years}{' '}
                            {t('common:years', 'ans')}
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
                          {artisan.experience_years} {t('common:years', 'ans')}{' '}
                          d'expérience
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
            {t(
              'pages:home.artisans.cta',
              'Chaque achat soutient directement ces artisans et leurs familles, préservant un patrimoine culturel unique.'
            )}
          </p>
        </div>
      </div>
    </section>
  );
};

export default ArtisansSection;
