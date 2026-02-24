// Compact settings menu for tablet viewports - combines language, theme, and currency
import { Globe, Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { useLanguageStore } from '@/stores/languageStore';
import { useCurrencyStore, type Currency } from '@/stores/currencyStore';
import { useThemeStore } from '@/stores/themeStore';
import {
  supportedLanguages,
  languageConfig,
  type SupportedLanguage,
} from '@/i18n';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';

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
  const currentLangConfig =
    languageConfig[normalizedLocale] || languageConfig.fr;

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

      <DropdownMenuContent
        align="end"
        className="w-56 p-0 bg-popover border border-border shadow-xl rounded-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Language Section */}
        <div className="px-3 py-2.5 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Globe className="h-3.5 w-3.5" />
            {t('language.label')}
          </div>
        </div>
        <div className="p-1.5">
          {supportedLanguages.map((lang) => {
            const config = languageConfig[lang];
            const isSelected = locale === lang;
            return (
              <DropdownMenuItem
                key={lang}
                onClick={() => setLocale(lang)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50'
                  }
                `}
              >
                <span className="text-lg">{config.flag}</span>
                <span className="flex-1 text-sm">{config.nativeName}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Theme Section */}
        <div className="px-3 py-2.5 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {theme === 'dark' ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
            {t('theme.label')}
          </div>
        </div>
        <div className="p-1.5">
          <DropdownMenuItem
            onClick={() => setTheme('light')}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
              ${
                theme === 'light'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50'
              }
            `}
          >
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
              <Sun className="h-4 w-4 text-amber-600" />
            </div>
            <span className="flex-1 text-sm">{t('theme.light')}</span>
            {theme === 'light' && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme('dark')}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
              ${
                theme === 'dark'
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50'
              }
            `}
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
              <Moon className="h-4 w-4 text-slate-300" />
            </div>
            <span className="flex-1 text-sm">{t('theme.dark')}</span>
            {theme === 'dark' && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Currency Section */}
        <div className="px-3 py-2.5 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="text-xs font-bold">€$</span>
            {t('currency.label')}
          </div>
        </div>
        <div className="p-1.5">
          {currencies.map((curr) => {
            const isSelected = currency === curr.code;
            return (
              <DropdownMenuItem
                key={curr.code}
                onClick={() => setCurrency(curr.code)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
                  ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/50'
                  }
                `}
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold">{curr.symbol}</span>
                </div>
                <span className="flex-1 text-sm">{curr.label}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CompactSettingsMenu;
