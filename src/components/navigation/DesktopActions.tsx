import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Package,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CurrencySelector from '@/components/CurrencySelector';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import CompactSettingsMenu from '@/components/CompactSettingsMenu';
import type { User as SupaUser } from '@supabase/supabase-js';
import type { Profile } from '@/context/AuthContext';

interface DesktopActionsProps {
  user: SupaUser | null;
  profile: Profile | null;
  isLoading: boolean;
  itemCount: number;
  wishlistCount: number;
  currentPath: string;
  showSearch: boolean;
  onToggleSearch: () => void;
  onSignOut: () => void;
}

export const DesktopActions = ({
  user,
  profile,
  isLoading,
  itemCount,
  wishlistCount,
  currentPath,
  showSearch: _showSearch,
  onToggleSearch,
  onSignOut,
}: DesktopActionsProps) => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1 md:gap-2 lg:gap-2 xl:gap-3 flex-shrink-0 w-auto justify-end">
      {/* Search Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSearch}
        className="hidden md:flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300 touch-manipulation text-foreground"
        aria-label={t('nav.search')}
      >
        <Search size={18} className="transition-colors" />
      </Button>

      {/* Wishlist - Desktop only */}
      <Button
        variant="ghost"
        size="sm"
        className="hidden lg:flex relative items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-primary/10 rounded-lg transition-all duration-300 touch-manipulation"
        onClick={() => {
          if (!user) return;
          if (currentPath === '/wishlist') {
            toast.info(t('messages.alreadyOnPage'), { duration: 2000 });
          } else {
            navigate('/wishlist');
          }
        }}
        disabled={!user}
        aria-label={t('nav.wishlist')}
      >
        <span
          className={clsx(
            'flex items-center justify-center w-full h-full text-foreground hover:text-primary transition-colors duration-300',
            !user && 'opacity-30'
          )}
        >
          <Heart className="h-4 w-4 transition-colors" />
          {user && wishlistCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[16px] font-medium">
              {wishlistCount}
            </span>
          )}
        </span>
      </Button>

      {/* Language Selector - xl+ */}
      <div className="hidden xl:block">
        <LanguageSelector variant="minimal" />
      </div>

      {/* Compact Settings - md to xl */}
      <CompactSettingsMenu className="hidden md:flex xl:hidden" />

      {/* Currency - xl+ */}
      <div className="hidden xl:block">
        <CurrencySelector />
      </div>

      {/* Theme - xl+ */}
      <ThemeToggle className="hidden xl:flex" />

      {/* Cart Button */}
      <Link
        to="/cart"
        className="hidden md:block"
        data-testid="nav-cart-link"
        aria-label={`${t('nav.cart')} (${itemCount})`}
      >
        <Button
          variant="outline"
          size="sm"
          className={clsx(
            'border-border transition-all duration-300 flex items-center group relative text-sm px-2 lg:px-3 py-2 rounded-lg hover:shadow-md touch-manipulation font-medium whitespace-nowrap',
            itemCount >= 1
              ? 'bg-primary text-primary-foreground border-primary shadow-md hover:bg-background hover:text-primary hover:border-primary'
              : 'bg-background text-foreground hover:bg-primary/10 hover:text-primary hover:border-border'
          )}
        >
          <ShoppingBag
            className={clsx(
              'h-4 w-4 transition-colors lg:mr-1',
              itemCount >= 1
                ? 'text-primary-foreground group-hover:text-primary'
                : 'text-foreground group-hover:text-primary'
            )}
          />
          <span className="hidden lg:inline" data-testid="nav-cart-count">
            ({itemCount})
          </span>
        </Button>
      </Link>

      {/* Auth buttons */}
      <div className="hidden md:flex items-center gap-1 lg:gap-2">
        {isLoading ? (
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-muted animate-pulse" />
        ) : user ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="group relative hidden xl:inline-flex hover:bg-primary/10 rounded-lg transition-all duration-300"
            >
              <Link
                to="/orders"
                className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 text-foreground hover:text-primary transition-colors duration-300"
              >
                <Package className="h-4 w-4 transition-colors" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="group relative hover:bg-primary/10 rounded-lg transition-all duration-300 touch-manipulation"
            >
              <Link
                to="/profile"
                className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 transition-colors duration-300"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Profile'}
                    className="w-7 h-7 lg:w-8 lg:h-8 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
                  />
                ) : (
                  <User className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                )}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignOut}
              className="hidden md:inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 hover:bg-primary/10 text-foreground hover:text-primary rounded-lg transition-all duration-300"
              aria-label={t('nav.logout')}
            >
              <LogOut className="h-4 w-4 transition-colors" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs lg:text-sm px-2 lg:px-3 py-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-all duration-300 touch-manipulation font-medium whitespace-nowrap"
          >
            <Link to="/auth">{t('nav.login')}</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
