import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface NavLinkProps {
  to: string;
  label: string;
  currentPath: string;
  onClick?: (e: React.MouseEvent) => boolean | void;
  tabIndex?: number;
}

export const NavLink = ({ to, label, currentPath, onClick, tabIndex }: NavLinkProps) => {
  const isActive = currentPath === to;

  return (
    <li>
      <Link
        to={to}
        onClick={(e) => onClick?.(e)}
        tabIndex={tabIndex}
        className={clsx(
          'relative px-3 lg:px-4 py-2 text-sm font-medium transition-all duration-300 hover:text-primary hover:bg-primary/10 rounded-lg whitespace-nowrap touch-manipulation text-center block',
          isActive ? 'text-primary bg-primary/10' : 'text-foreground'
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {label}
        {isActive && (
          <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    </li>
  );
};
