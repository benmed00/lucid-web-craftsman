
# Plan de consolidation de l'admin

Objectif : éliminer les doublons de logique, supprimer le code mort, centraliser les patterns dupliqués, et rendre l'admin cohérent — sans toucher au design ni à l'i18n (FR conservé inline).

## État actuel (audit)

- **21 pages admin**, ~14 600 lignes, plusieurs fichiers > 800 lignes.
- **Doublons de pages** :
  - `AdminOrders.tsx` (724 l.) ↔ `AdminOrdersEnhanced.tsx` (409 l.) — deux routes actives (`/admin/orders` et `/admin/orders-enhanced`), la sidebar pointe vers Enhanced.
  - `AdminProducts.tsx` (635 l.) ↔ `AdminProductCatalog.tsx` (691 l.) — deux entrées dans la sidebar (« Produits » et « Catalogue Complet »).
- **Doublons de composants** dans `src/components/admin/` :
  - 4× boutons d'envoi d'email : `SendShippingEmailButton`, `SendDeliveryEmailButton`, `SendCancellationEmailButton` + les variantes `Test*EmailButton` — même structure copiée.
  - `ManualTestOrderStatus` + `TestOrderEmailButton` recouvrent `AdminEmailTesting`.
- **RBAC hybride** : `useAdminAuth` s'appuie sur `user_roles` (bon), mais la table `admin_users` existe encore et est référencée dans plusieurs pages.
- **Sidebar** : 19 entrées à plat, pas de regroupement, pas d'état actif fiable pour les sous-routes.
- **Pas de standardisation** : chaque page refait sa propre table, sa propre pagination, ses propres skeletons, ses propres toasts d'erreur.

## Phase 1 — Fusion des pages en double

### 1.1 Commandes (une seule vue `/admin/orders`)

Nouvelle page unique reprenant le meilleur des deux :
- **De `AdminOrdersEnhanced`** : `OrderStatsCards`, `OrderCommandPalette`, `CheckoutSessionsTab`, `OrderAnomaliesList`, `FraudAssessmentPanel`, `OrderDetailsPanel` avec onglets (Customer / Payment / Coupon / History).
- **De `AdminOrders`** : filtres avancés (statut, date, montant), export CSV, actions bulk, `AddOrderDialog`.

Structure cible :
```text
/admin/orders
├── Header : stats cards + bouton "Nouvelle commande"
├── Tabs : Commandes | Sessions checkout | Anomalies
├── Toolbar : recherche + filtres + export
├── Table unifiée (voir Phase 3)
└── Drawer latéral : OrderDetailsPanel (onglets)
```

Suppressions :
- `src/pages/admin/AdminOrders.tsx`
- Route `/admin/orders-enhanced` (redirect 301 côté client vers `/admin/orders` pour les anciens liens).
- Entrée sidebar « orders-enhanced ».

### 1.2 Produits (une seule vue `/admin/products`)

Fusion `AdminProducts` + `AdminProductCatalog` :
- Vue liste avec **toggle Grid / Table** (Grid = actuel Catalog, Table = actuel Products).
- Filtres partagés : catégorie, tags, stock, disponibilité, prix.
- Formulaire unique via `ProductFormWithImages` + `ProductImageManager`.
- Bulk actions : activation, catégorisation, suppression.

Suppressions :
- `AdminProductCatalog.tsx`
- Route `/admin/catalog` (redirect vers `/admin/products`).
- Entrée sidebar « Catalogue Complet ».

## Phase 2 — Centralisation des composants dupliqués

### 2.1 Emails transactionnels (bouton unique)

Créer `src/components/admin/orders/OrderEmailActions.tsx` piloté par un enum :
```ts
type OrderEmailType = 'confirmation' | 'shipping' | 'delivery' | 'cancellation';
<OrderEmailActions orderId={id} type="shipping" mode="send" />
<OrderEmailActions orderId={id} type="shipping" mode="test" />
```
Supprimer les 8 fichiers `Send*EmailButton.tsx` + `Test*EmailButton.tsx` + `ManualTestOrderStatus.tsx`.

### 2.2 Statuts de commande

Un seul point d'entrée `orderStatusRegistry.ts` : mapping `status → label FR + variant Badge + transitions autorisées + email associé`. Utilisé par `OrderStatusBadge`, `OrderStatusSelect`, `OrderHistoryTimeline` et `OrderEmailActions`. Aligné sur `order_status_customer_mapping` + `order_state_transitions` en base.

### 2.3 Hooks data partagés

Extraire dans `src/hooks/admin/` :
- `useAdminOrders(filters)` — remplace 4 duplications de `supabase.from('orders').select(...)`.
- `useAdminProducts(filters)`
- `useAdminCustomers(filters)`
- `useAdminMutations` (update status, refund, cancel) avec invalidation React Query centralisée.

## Phase 3 — Standardisation UI (sans redesign)

### 3.1 Composants transverses `src/components/admin/shared/`

- `<AdminDataTable>` — wrapper standard (colonnes, tri, pagination, sélection, empty state, skeleton).
- `<AdminPageHeader title, description, actions, breadcrumbs>` — remplace le header ad hoc de chaque page.
- `<AdminFilters>` — barre de filtres réutilisable (search + selects + date range).
- `<AdminErrorBoundary>` — englobe chaque route admin dans `AdminLayout` pour éviter qu'une page cassée ne casse tout.
- `<AdminEmptyState>` et `<AdminLoadingState>` (skeletons cohérents).

### 3.2 Sidebar regroupée

Refonte de `AdminLayout` pour regrouper les 19 entrées :
```text
Ventes       : Commandes · Clients · Codes promo
Catalogue    : Produits · Stocks · Tags · Avis
Contenu      : Blog · Image principale · Traductions
Marketing    : Marketing · Newsletter · Emails
Système      : Analyses · Rapports d'erreurs · Statut APIs · Paramètres
```
Utilisation de `shadcn/ui sidebar` avec `NavLink` (état actif fiable, y compris sous-routes) + trigger mobile correctement branché sur `SidebarProvider`.

## Phase 4 — Nettoyage RBAC & sécurité

- Supprimer les références restantes à `admin_users` dans le code applicatif (le RBAC passe par `user_roles` + `has_role`).
- Table `admin_users` conservée en base tant qu'un audit dédié n'est pas fait (à traiter dans un plan séparé).
- Ajouter `logAccessDenied` sur toutes les mutations admin (déjà présent sur `reverifyAdmin`).
- Wrapper `useAdminMutations` : refuse la mutation si `canAdmin(role)` = false, sans dépendre uniquement de RLS.

## Phase 5 — Validation

- Écrire un smoke test manuel : chaque route admin charge sans erreur, la sidebar met en surbrillance la bonne entrée, les redirects legacy fonctionnent.
- `pnpm run type:check` + `pnpm run lint` doivent passer après suppression des fichiers morts.
- Vérifier qu'aucun import ne pointe encore vers les fichiers supprimés (`rg "AdminOrdersEnhanced|AdminProductCatalog|SendShippingEmailButton"`).

## Livrables

| # | Livrable | Impact |
|---|---|---|
| 1 | Page Orders unifiée + redirect | -1 page, -300 l. |
| 2 | Page Products unifiée + redirect | -1 page, -400 l. |
| 3 | `OrderEmailActions` + suppression 8 boutons | -600 l. |
| 4 | `orderStatusRegistry` | source unique de vérité |
| 5 | Hooks admin partagés | -800 l. de duplication |
| 6 | `AdminDataTable` + `AdminPageHeader` + `AdminErrorBoundary` | pages plus courtes, plus robustes |
| 7 | Sidebar regroupée | 5 sections, navigation lisible |
| 8 | Nettoyage `admin_users` (code) | RBAC unifié |

**Estimation** : ~2 500 lignes supprimées, 0 régression fonctionnelle, aucune migration SQL nécessaire pour cette phase.

## Détails techniques

- Aucune migration DB dans ce plan — la table `order_status_customer_mapping` sert déjà de source pour les libellés côté client.
- Redirects legacy implémentés via `<Route path="orders-enhanced" element={<Navigate to="/admin/orders" replace />} />` dans `App.tsx`.
- React Query : introduire des `queryKeys` centralisés (`adminKeys.orders.list(filters)`) pour éviter les invalidations manquées.
- Les tests Cypress admin existants (`admin_dashboard_spec.js`) restent verts — les routes principales gardent la même URL.
- Rien ne touche au design system (couleurs, fonts, spacing) ni à l'i18n front public.

## Hors périmètre (à planifier séparément)

- Traduction FR/EN de l'admin.
- Refonte visuelle / redesign de l'admin.
- Suppression physique de la table `admin_users` (nécessite audit).
- Permissions granulaires super_admin vs admin vs staff.
- Tests E2E admin exhaustifs.
