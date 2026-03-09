import { useTranslation } from 'react-i18next';
import { NavLink } from './NavLink';

interface DesktopNavProps {
  currentPath: string;
  onNavClick: (path: string, e?: React.MouseEvent) => boolean;
}

export const DesktopNav = ({ currentPath, onNavClick }: DesktopNavProps) => {
  const { t } = useTranslation('common');

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/products', label: t('nav.shop') },
    { to: '/blog', label: t('nav.blog') },
    { to: '/contact', label: t('nav.contact') },
  ];

  return (
    <nav
      className="header-nav hidden md:flex items-center justify-center flex-1 max-w-md lg:max-w-lg xl:max-w-xl mx-2"
      role="navigation"
      aria-label={t('accessibility.mainNav')}
    >
      <ul className="flex items-center justify-center space-x-2 lg:space-x-3 list-none m-0 p-0">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            label={link.label}
            currentPath={currentPath}
            onClick={(e) => onNavClick(link.to, e)}
          />
        ))}
      </ul>
    </nav>
  );
};
