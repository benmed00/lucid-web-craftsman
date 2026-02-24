/**
 * Translation Fallback Indicator
 *
 * Visual indicator shown when content is displayed in a fallback language
 * because a translation is not available in the user's preferred language.
 */

import { AlertTriangle, Globe, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { SupportedLocale } from '@/services/translationService';
import { cn } from '@/lib/utils';

interface TranslationFallbackIndicatorProps {
  /** Whether a fallback translation is being used */
  isFallback: boolean;
  /** The locale being displayed (fallback locale) */
  displayedLocale: SupportedLocale;
  /** The user's preferred locale */
  preferredLocale?: SupportedLocale;
  /** Visual variant */
  variant?: 'badge' | 'inline' | 'tooltip';
  /** Additional className */
  className?: string;
}

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  es: 'Español',
  de: 'Deutsch',
};

export function TranslationFallbackIndicator({
  isFallback,
  displayedLocale,
  preferredLocale,
  variant = 'badge',
  className,
}: TranslationFallbackIndicatorProps) {
  const { t } = useTranslation('common');

  if (!isFallback) return null;

  const message = t('translation.fallbackMessage', {
    defaultValue: `Content shown in ${LOCALE_NAMES[displayedLocale]} (translation not available)`,
    language: LOCALE_NAMES[displayedLocale],
  });

  if (variant === 'tooltip') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-flex items-center cursor-help', className)}
          >
            <Globe className="h-3 w-3 text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{message}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400',
          className
        )}
      >
        <Info className="h-3 w-3" />
        <span>{LOCALE_NAMES[displayedLocale]}</span>
      </span>
    );
  }

  // Default: badge variant
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        className
      )}
    >
      <AlertTriangle className="h-3 w-3 mr-1" />
      {LOCALE_NAMES[displayedLocale]}
    </Badge>
  );
}

/**
 * Compact fallback indicator for use in lists/grids
 */
export function FallbackDot({
  isFallback,
  locale,
  className,
}: {
  isFallback: boolean;
  locale: SupportedLocale;
  className?: string;
}) {
  if (!isFallback) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 animate-pulse cursor-help',
            className
          )}
          aria-label={`Shown in ${LOCALE_NAMES[locale]}`}
        />
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">
          Affiché en {LOCALE_NAMES[locale]}
          <br />
          <span className="text-muted-foreground">
            (traduction non disponible)
          </span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default TranslationFallbackIndicator;
