/**
 * Admin navigation — source de vérité unique pour :
 *  - les chemins canoniques des routes /admin/*
 *  - les alias (routes historiques qui redirigent vers un canonique)
 *  - la structure du menu (groupes, libellés, icônes)
 *  - le rôle requis par item (filtrage selon l'état d'accès)
 *
 * Consommé par AdminLayout (sidebar) et AdminDashboard (raccourcis / liens
 * "Voir tout"), pour garantir que tous pointent vers les mêmes cibles.
 */
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  Mail,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Users,
  Warehouse,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/lib/rbac';
import { canAdmin, canSuperAdmin } from '@/lib/rbac';

// --- Chemins canoniques (à réutiliser partout : Link to={ADMIN_ROUTES.orders}) ---
export const ADMIN_ROUTES = {
  dashboard: '/admin',
  orders: '/admin/orders',
  customers: '/admin/customers',
  promoCodes: '/admin/promo-codes',
  products: '/admin/products',
  inventory: '/admin/inventory',
  reviews: '/admin/reviews',
  blog: '/admin/blog',
  tags: '/admin/tags',
  heroImage: '/admin/hero-image',
  translations: '/admin/translations',
  marketing: '/admin/marketing',
  newsletter: '/admin/newsletter',
  emailTesting: '/admin/email-testing',
  analytics: '/admin/analytics',
  errorReports: '/admin/error-reports',
  apiStatus: '/admin/api-status',
  settings: '/admin/settings',
} as const;

/** Alias historiques qui redirigent vers un chemin canonique.
 *  Utilisés pour l'état "actif" du menu (met en surbrillance le bon item
 *  quand l'utilisateur arrive via une URL alias). */
export const ADMIN_ROUTE_ALIASES: Record<string, string[]> = {
  [ADMIN_ROUTES.dashboard]: ['/admin/dashboard'],
  [ADMIN_ROUTES.orders]: ['/admin/orders-enhanced'],
  [ADMIN_ROUTES.products]: ['/admin/catalog'],
};

export interface AdminNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Rôle minimum requis. Défaut : 'admin'. */
  requiredRole?: 'admin' | 'super_admin';
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Structure complète du menu (toutes les entrées, tous rôles confondus). */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Général',
    items: [
      {
        icon: LayoutDashboard,
        label: 'Tableau de bord',
        path: ADMIN_ROUTES.dashboard,
      },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { icon: ShoppingCart, label: 'Commandes', path: ADMIN_ROUTES.orders },
      { icon: Users, label: 'Clients', path: ADMIN_ROUTES.customers },
      { icon: Tag, label: 'Codes Promo', path: ADMIN_ROUTES.promoCodes },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { icon: Package, label: 'Produits', path: ADMIN_ROUTES.products },
      { icon: Warehouse, label: 'Stocks', path: ADMIN_ROUTES.inventory },
      { icon: Star, label: 'Avis clients', path: ADMIN_ROUTES.reviews },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { icon: BookOpen, label: 'Blog', path: ADMIN_ROUTES.blog },
      { icon: Tag, label: 'Tags Blog', path: ADMIN_ROUTES.tags },
      {
        icon: ImageIcon,
        label: 'Image Principale',
        path: ADMIN_ROUTES.heroImage,
      },
      {
        icon: Languages,
        label: 'Traductions',
        path: ADMIN_ROUTES.translations,
      },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Megaphone, label: 'Marketing', path: ADMIN_ROUTES.marketing },
      { icon: Mail, label: 'Newsletter', path: ADMIN_ROUTES.newsletter },
      {
        icon: Mail,
        label: 'Tests Emails',
        path: ADMIN_ROUTES.emailTesting,
      },
    ],
  },
  {
    label: 'Système',
    items: [
      { icon: BarChart3, label: 'Analyses', path: ADMIN_ROUTES.analytics },
      {
        icon: AlertTriangle,
        label: "Rapports d'erreurs",
        path: ADMIN_ROUTES.errorReports,
        requiredRole: 'super_admin',
      },
      {
        icon: Activity,
        label: 'Statut APIs',
        path: ADMIN_ROUTES.apiStatus,
        requiredRole: 'super_admin',
      },
      {
        icon: Settings,
        label: 'Paramètres',
        path: ADMIN_ROUTES.settings,
        requiredRole: 'super_admin',
      },
    ],
  },
];

/** Vérifie si un item est visible pour le rôle courant. */
export function canAccessAdminNavItem(
  item: AdminNavItem,
  role: AppRole
): boolean {
  if (item.requiredRole === 'super_admin') return canSuperAdmin(role);
  return canAdmin(role);
}

/** Retourne les groupes filtrés selon le rôle (retire les items non
 *  autorisés et les groupes vides). */
export function filterAdminNavByRole(role: AppRole): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessAdminNavItem(item, role)),
  })).filter((group) => group.items.length > 0);
}

/** Retourne le chemin canonique pour une URL donnée (résout les alias). */
export function resolveAdminCanonicalPath(pathname: string): string {
  for (const [canonical, aliases] of Object.entries(ADMIN_ROUTE_ALIASES)) {
    if (aliases.includes(pathname)) return canonical;
  }
  return pathname;
}

/** Détermine si un item du menu doit être marqué "actif" pour l'URL donnée. */
export function isAdminNavItemActive(
  item: AdminNavItem,
  pathname: string
): boolean {
  const resolved = resolveAdminCanonicalPath(pathname);
  if (item.path === ADMIN_ROUTES.dashboard) {
    return resolved === ADMIN_ROUTES.dashboard;
  }
  return resolved === item.path || resolved.startsWith(item.path + '/');
}
