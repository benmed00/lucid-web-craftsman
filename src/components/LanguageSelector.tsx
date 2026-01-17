// Language selector component
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguageStore } from '@/stores/languageStore';
import { supportedLanguages, languageConfig, type SupportedLanguage } from '@/i18n';

interface LanguageSelectorProps {
  variant?: 'default' | 'minimal' | 'full';
  className?: string;
}

export function LanguageSelector({ variant = 'default', className }: LanguageSelectorProps) {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLanguageStore();
  const currentConfig = languageConfig[locale];

  const handleLanguageChange = (newLocale: SupportedLanguage) => {
    setLocale(newLocale);
  };

  // Minimal variant - just flag
  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={t('accessibility.selectLanguage')}
          >
            <span className="text-lg" role="img" aria-label={currentConfig.nativeName}>
              {currentConfig.flag}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLanguages.map((lang) => {
            const config = languageConfig[lang];
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={locale === lang ? 'bg-accent' : ''}
              >
                <span className="mr-2">{config.flag}</span>
                {config.nativeName}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full variant - flag + full name
  if (variant === 'full') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={className}
            aria-label={t('accessibility.selectLanguage')}
          >
            <span className="mr-2">{currentConfig.flag}</span>
            {currentConfig.nativeName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {supportedLanguages.map((lang) => {
            const config = languageConfig[lang];
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={locale === lang ? 'bg-accent' : ''}
              >
                <span className="mr-2">{config.flag}</span>
                <span className="flex-1">{config.nativeName}</span>
                {locale === lang && <span className="ml-2 text-primary">✓</span>}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant - globe icon + flag
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 ${className}`}
          aria-label={t('accessibility.selectLanguage')}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm">{currentConfig.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => {
          const config = languageConfig[lang];
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={locale === lang ? 'bg-accent' : ''}
            >
              <span className="mr-2">{config.flag}</span>
              <span className="flex-1">{config.nativeName}</span>
              {locale === lang && <span className="ml-2 text-primary">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSelector;
