import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/stores';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'default';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, size = 'sm' }) => {
  const { t } = useTranslation('common');
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={toggleTheme}
      className={clsx(
        "relative items-center justify-center rounded-lg transition-all duration-300 touch-manipulation",
        size === 'sm' ? "w-9 h-9 lg:w-10 lg:h-10" : "w-10 h-10",
        "hover:bg-accent text-muted-foreground hover:text-accent-foreground",
        className
      )}
      aria-label={isDark ? t('accessibility.enableLightMode') : t('accessibility.enableDarkMode')}
    >
      <Sun 
        className={clsx(
          "h-4 w-4 transition-all duration-300",
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} 
      />
      <Moon 
        className={clsx(
          "absolute h-4 w-4 transition-all duration-300",
          isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )} 
      />
    </Button>
  );
};

export default ThemeToggle;
