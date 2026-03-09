import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ShoppingBag, X, User, LogOut, Heart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CurrencySelector from '@/components/CurrencySelector';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { SearchBar } from './SearchBar';
import type { User as SupaUser } from '@supabase/supabase-js';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: SupaUser | null;
  isLoading: boolean;
  itemCount: number;
  wishlistCount: number;
  currentPath: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onNavClick: (path: string, e?: React.MouseEvent) => boolean;
  onSignOut: () => void;
}

export const MobileMenu = ({
  isOpen, onClose, user, isLoading, itemCount, wishlistCount,
  currentPath, searchQuery, onSearchChange, onSearchSubmit,
  onNavClick, onSignOut,
}: MobileMenuProps) => {
  const { t } = useTranslation(['common', 'auth']);
  const navigate = useNavigate();

  const navLinks = [
    { to: '/', label: t('common:nav.home'), icon: Leaf },
    { to: '/products', label: t('common:nav.shop'), icon: ShoppingBag },
    { to: '/blog', label: t('common:nav.blog'), icon: Package },
    { to: '/contact', label: t('common:nav.contact'), icon: User },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-foreground/50 z-mobile-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menu Panel */}
      <div
        id="mobile-menu"
        className={`md:hidden fixed top-0 right-0 h-full w-full max-w-xs sm:max-w-sm bg-background shadow-2xl z-mobile-menu transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
        // @ts-expect-error - inert is a valid HTML attribute but not yet in React types
        inert={!isOpen ? '' : undefined}
        role="menu"
        aria-label={t('common:accessibility.mobileNav')}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-full bg-primary">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold text-foreground">{t('common:brand.name')}</span>
              <p className="text-sm text-muted-foreground">{t('common:brand.tagline')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors touch-manipulation" aria-label={t('common:accessibility.closeMenu')} tabIndex={isOpen ? 0 : -1}>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-6">
          <SearchBar searchQuery={searchQuery} onSearchChange={onSearchChange} onSubmit={onSearchSubmit} variant="mobile" isMenuOpen={isOpen} />

          {/* Nav Links */}
          <div className="px-6 py-4 space-y-2">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-manipulation ${
                  currentPath === to ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/10 hover:text-primary'
                }`}
                onClick={(e) => { if (!onNavClick(to, e)) return; onClose(); }}
                tabIndex={isOpen ? 0 : -1}
              >
                <div className={`p-2 rounded-lg ${currentPath === to ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${currentPath === to ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>
                <span className="font-medium text-lg">{label}</span>
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="px-6 py-4 border-t border-border">
            <Link to="/cart" className="block mb-4" onClick={onClose} tabIndex={isOpen ? 0 : -1}>
              <Button
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-medium text-lg transition-all duration-200 ${
                  itemCount >= 1 ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                tabIndex={isOpen ? 0 : -1}
              >
                <ShoppingBag className="h-5 w-5" />
                <span>{t('common:nav.cart')} {itemCount > 0 && `(${itemCount})`}</span>
              </Button>
            </Link>

            {!isLoading && (
              <div className="space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <div className="p-2 bg-primary rounded-full"><User className="h-4 w-4 text-primary-foreground" /></div>
                      <span className="text-sm font-medium text-secondary-foreground">{t('auth:messages.loggedIn')}</span>
                    </div>
                    <div className="space-y-2">
                      <Link to="/profile" className="flex items-center gap-3 p-3 text-foreground hover:bg-muted rounded-lg transition-colors" onClick={onClose} tabIndex={isOpen ? 0 : -1}>
                        <User className="h-5 w-5" /><span>{t('common:nav.profile')}</span>
                      </Link>
                      <Link to="/orders" className="flex items-center gap-3 p-3 text-foreground hover:bg-muted rounded-lg transition-colors" onClick={onClose} tabIndex={isOpen ? 0 : -1}>
                        <Package className="h-5 w-5" /><span>{t('common:nav.orders')}</span>
                      </Link>
                      <button
                        className="flex items-center justify-between p-3 text-foreground hover:bg-muted rounded-lg transition-colors w-full"
                        onClick={() => {
                          onClose();
                          if (currentPath === '/wishlist') { toast.info(t('common:messages.alreadyOnPage'), { duration: 2000 }); }
                          else { navigate('/wishlist'); }
                        }}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <div className="flex items-center gap-3"><Heart className="h-5 w-5" /><span>{t('common:nav.wishlist')}</span></div>
                        {wishlistCount > 0 && <span className="bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">{wishlistCount}</span>}
                      </button>
                      <button onClick={onSignOut} className="flex items-center gap-3 w-full p-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" tabIndex={isOpen ? 0 : -1}>
                        <LogOut className="h-5 w-5" /><span>{t('common:nav.logout')}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <Button variant="default" asChild className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium" tabIndex={isOpen ? 0 : -1}>
                    <Link to="/auth" onClick={onClose}><User className="mr-2 h-5 w-5" />{t('common:nav.login')}</Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="px-6 py-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:language.label')}:</span>
              <LanguageSelector variant="minimal" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:theme.label')}:</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{t('common:currency.label')}:</span>
              <div tabIndex={isOpen ? 0 : -1}><CurrencySelector /></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
