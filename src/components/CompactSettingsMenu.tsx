// Compact settings menu for tablet viewports - combines language, theme, and currency
import { Globe, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { useLanguageStore } from '@/stores/languageStore';
import { useCurrencyStore } from '@/stores/currencyStore';
import { useThemeStore } from '@/stores/themeStore';
import { supportedLanguages, languageConfig, type SupportedLanguage } from '@/i18n';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import type { Currency } from '@/stores/currencyStore';

const currencies: { code: Currency; symbol: string; label: string }[] = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'USD', symbol: '$', label: 'Dollar' },
  { code: 'GBP', symbol: '£', label: 'Pound' },
  { code: 'MAD', symbol: 'DH', label: 'Dirham' },
];

interface CompactSettingsMenuProps {
  className?: string;
}

export function CompactSettingsMenu({ className }: CompactSettingsMenuProps) {
  const { t } = useTranslation('common');
  const { locale, setLocale } = useLanguageStore();
  const { currency, setCurrency } = useCurrencyStore();
  const { theme, setTheme } = useThemeStore();
  
  const normalizedLocale = (locale?.split('-')[0] || 'fr') as SupportedLanguage;
  const currentLangConfig = languageConfig[normalizedLocale] || languageConfig.fr;
  const currentCurrency = currencies.find(c => c.code === currency) || currencies[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-1.5 h-9 px-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300 ${className}`}
          aria-label={t('accessibility.selectLanguage')}
        >
          <span className="text-base">{currentLangConfig.flag}</span>
          <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Language Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          {t('language.label')}
        </DropdownMenuLabel>
        {supportedLanguages.map((lang) => {
          const config = languageConfig[lang];
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLocale(lang)}
              className={locale === lang ? 'bg-accent' : ''}
            >
              <span className="mr-2">{config.flag}</span>
              <span className="flex-1">{config.nativeName}</span>
              {locale === lang && <span className="ml-2 text-primary">✓</span>}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        {/* Theme Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          {theme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          {t('theme.label')}
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'bg-accent' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span className="flex-1">{t('theme.light')}</span>
          {theme === 'light' && <span className="ml-2 text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'bg-accent' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span className="flex-1">{t('theme.dark')}</span>
          {theme === 'dark' && <span className="ml-2 text-primary">✓</span>}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Currency Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t('currency.label')}
        </DropdownMenuLabel>
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setCurrency(curr.code)}
            className={currency === curr.code ? 'bg-accent' : ''}
          >
            <span className="mr-2 font-medium w-6">{curr.symbol}</span>
            <span className="flex-1">{curr.label}</span>
            {currency === curr.code && <span className="ml-2 text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CompactSettingsMenu;
