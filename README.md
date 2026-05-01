# 🏺 Rif Raw Straw - Marketplace Artisanal Berbère

[![Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4.svg)](https://lovable.dev)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-green.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0+-06B6D4.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg)](https://vitejs.dev/)
[![CI](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/ci.yml/badge.svg)](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/ci.yml)
[![E2E](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/e2e.yml/badge.svg)](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/e2e.yml)
[![Deno create-payment](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml/badge.svg)](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml)

## 📖 Vue d'ensemble

**Rif Raw Straw** est une marketplace en ligne dédiée à la promotion et à la vente de produits artisanaux berbères authentiques. Cette plateforme moderne connecte les artisans berbères traditionnels avec une clientèle mondiale, préservant ainsi l'héritage culturel tout en offrant une expérience d'achat premium.

### 🎯 Mission

Valoriser l'artisanat berbère traditionnel en créant une vitrine numérique moderne qui respecte l'authenticité culturelle tout en offrant une expérience utilisateur exceptionnelle.

## ✨ Fonctionnalités Principales

### 🛍️ Expérience d'Achat

- **Catalogue de Produits** : Navigation intuitive avec filtres avancés
- **Aperçu Rapide** : Prévisualisation immédiate des produits sans quitter la page
- **Panier Intelligent** : Gestion d'état persistante avec calculs de livraison
- **Liste de Souhaits** : Sauvegarde de produits favoris avec synchronisation
- **Recherche Avancée** : Recherche par nom, catégorie, et caractéristiques

### 📱 Interface Utilisateur

- **Design Responsive** : Optimisé pour tous les appareils (mobile-first)
- **Interface Moderne** : Design épuré avec palette de couleurs terre
- **Animations Fluides** : Transitions et micro-interactions raffinées
- **Accessibilité** : Conforme aux standards WCAG 2.1
- **PWA Ready** : Installation possible sur mobile et desktop

### 🔐 Gestion Utilisateur

- **Authentification** : Système d'inscription/connexion sécurisé
- **Profil Utilisateur** : Gestion des informations personnelles
- **Historique Commandes** : Suivi complet des achats
- **Programme de Fidélité** : Système de points et récompenses

### 🏪 Fonctionnalités E-commerce

- **Gestion Inventaire** : Suivi en temps réel des stocks
- **Système de Paiement** : Intégration Stripe pour paiements sécurisés
- **Calcul Livraison** : Estimation automatique des frais de port
- **Notifications** : Alertes stock, promotions, et confirmations
- **Multi-devises** : Support EUR, USD, MAD

### 📊 Administration

- **Dashboard Admin** : Interface de gestion complète
- **Gestion Produits** : CRUD complet avec upload d'images
- **Analytics** : Statistiques de vente et comportement utilisateur
- **Gestion Commandes** : Traitement et suivi des commandes
- **Système de Reviews** : Modération des avis clients

## 🖼️ Aperçus de l'Application

### Page d'Accueil

![Homepage Hero](./public/assets/screenshots/homepage-hero.jpg)
_Interface principale avec navigation intuitive et mise en avant des produits_

### Cartes Produits

![Product Cards](./public/assets/screenshots/product-card-demo.jpg)
_Design moderne des cartes produits avec fonctionnalités interactives_

### Détail Produit

![Product Detail](./public/assets/screenshots/product-detail.jpg)
_Page produit complète avec galerie d'images et informations détaillées_

### Version Mobile

![Mobile Responsive](./public/assets/screenshots/mobile-responsive.jpg)
_Interface responsive optimisée pour les appareils mobiles_

### Panier & Checkout

![Cart and Checkout](./public/assets/screenshots/cart-checkout.jpg)
_Processus d'achat simplifié et sécurisé_

### Dashboard Utilisateur

![User Dashboard](./public/assets/screenshots/user-dashboard.jpg)
_Interface utilisateur pour la gestion du profil et des commandes_

### Section Blog

![Blog Section](./public/assets/screenshots/blog-section.jpg)
_Contenu éditorial sur la culture berbère et l'artisanat_

### Administration

![Admin Dashboard](./public/assets/screenshots/admin-dashboard.jpg)
_Interface d'administration complète pour la gestion de la plateforme_

### Contact & Footer

![Contact and Footer](./public/assets/screenshots/contact-footer.jpg)
_Page de contact et informations institutionnelles_

## 🚀 Technologies Utilisées

### Frontend

- **React 18.3.1** - Framework JavaScript moderne
- **TypeScript** - Typage statique pour plus de robustesse
- **Vite** - Build tool ultra-rapide
- **Tailwind CSS** - Framework CSS utilitaire
- **Shadcn/ui** - Composants UI modernes et accessibles

### Backend & Services

- **Supabase** - Backend-as-a-Service pour base de données et auth
- **Stripe** - Processeur de paiements sécurisés
- **Vercel** - Plateforme de déploiement et hébergement

### État & Navigation

- **React Router DOM** - Navigation côté client
- **Context API** - Gestion d'état globale
- **TanStack Query** - Cache et synchronisation des données

### Outils de Développement

- **ESLint** - Linting et qualité de code
- **Prettier** - Formatage automatique
- **Husky** - Hooks Git pour CI/CD
- **Vitest** - Framework de tests unitaires
- **Cypress** - Tests end-to-end navigateur ([`cypress/README.md`](cypress/README.md))

## 🛠️ Installation & Configuration

### Prérequis

- **Node.js** >= 18.0.0
- [**pnpm**](https://pnpm.io/) >= 9 (enable [Corepack](https://nodejs.org/api/corepack.html): `corepack enable`, then **`pnpm`** follows **`package.json`** **`packageManager`**)
- **Git** pour le contrôle de version

### Installation Locale

```bash
# Cloner le repository
git clone https://github.com/votre-username/rif-raw-straw.git
cd rif-raw-straw

# Installer les dépendances (voir pnpm-workspace.yaml : SPA + backend mock)
pnpm install

# Configurer les variables d'environnement
cp .env.example .env

# Éditer .env avec vos clés (Supabase, Stripe, etc.)

# Démarrer le serveur de développement
pnpm run dev

# Optionnel : Mock API pour produits/posts (autre terminal)
pnpm run start:api
```

### Variables d'Environnement

Copiez `.env.example` vers `.env` et renseignez les valeurs. Voir `.env.example` pour la liste complète. Variables principales :

```env
# Configuration Supabase (obligatoire)
VITE_SUPABASE_URL=https://your_project_id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Configuration Stripe (optionnel, pour les paiements)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Configuration Générale
VITE_API_URL=http://localhost:8080
VITE_PROD_URL=https://yourdomain.com
```

## 📁 Structure du Projet

```
rif-raw-straw/
├── 📁 backend/                   # Mock API (dev/staging)
│   ├── server.cjs               # Serveur Express + json-server
│   ├── db.json                  # Données produits/posts
│   ├── package.json
│   └── README.md
├── 📁 public/                    # Fichiers statiques
│   ├── 📁 assets/               # Images et ressources
│   └── 📄 manifest.json         # Configuration PWA
├── 📁 src/                      # Code source principal
│   ├── 📁 components/           # Composants React réutilisables
│   │   ├── 📁 ui/              # Composants UI de base
│   │   ├── 📁 admin/           # Composants d'administration
│   │   └── 📁 auth/            # Composants d'authentification
│   ├── 📁 pages/               # Pages de l'application
│   │   ├── 📁 admin/           # Pages d'administration
│   │   └── 📄 *.tsx            # Pages principales
│   ├── 📁 hooks/               # Hooks React personnalisés
│   ├── 📁 context/             # Contexts React (état global)
│   ├── 📁 services/            # API Supabase / Edge / mock — services/README.md
│   ├── 📁 shared/              # Types et interfaces partagés
│   ├── 📁 utils/               # Fonctions utilitaires
│   ├── 📁 data/                # Données statiques et mock
│   ├── 📁 config/              # Configuration de l'application
│   └── 📄 main.tsx             # Point d'entrée de l'application
├── 📁 cypress/                 # Tests E2E (specs, support) — voir cypress/README.md
├── 📁 docs/                    # Index: docs/README.md (platform, standards, E2E matrix)
├── 📁 scripts/                 # Scripts outils (OpenAPI, Postman, Cypress shard…) — scripts/README.md
├── 📁 openapi/                 # OpenAPI généré (Edge Functions) — openapi/README.md
├── 📁 postman/                 # Collection Postman générée — postman/README.md
├── 📁 supabase/                # Migrations, config, Edge Functions — supabase/README.md
├── 📄 cypress.config.ts        # Configuration Cypress
├── 📄 tailwind.config.ts       # Configuration Tailwind CSS
├── 📄 vite.config.ts           # Configuration Vite
├── 📄 tsconfig.json            # Configuration TypeScript
└── 📄 package.json             # Dépendances et scripts
```

## 🎨 Système de Design

### Palette de Couleurs

- **Primaire** : Olive Green (#8B7A4D) - Inspiration terre berbère
- **Secondaire** : Stone Gray (#78716C) - Neutralité moderne
- **Accent** : Warm Amber (#F59E0B) - Touches dorées
- **Fond** : Off-White (#FAFAF9) - Clarté et lisibilité

### Typographie

- **Titre** : Police serif moderne pour l'élégance
- **Corps** : Police sans-serif pour la lisibilité
- **Interface** : Police système optimisée

### Composants UI

- **Cartes** : Design épuré avec ombres subtiles
- **Boutons** : États interactifs avec micro-animations
- **Navigation** : Interface claire et intuitive
- **Formulaires** : Validation en temps réel

## 🔧 Identifiants des Boutons

L'application utilise un système d'identification uniforme pour tous les boutons interactifs. Consultez le fichier [`src/config/buttonIdentifiers.json`](./src/config/buttonIdentifiers.json) pour la documentation complète des identifiants.

### Exemples d'Identifiants

```javascript
// Cartes produits
quickViewBtn: 'quick-view-btn-{productId}';
addToCartBtn: 'add-to-cart-btn-{productId}';
wishlistBtn: 'wishlist-btn-{productId}';

// Navigation principale
cartButton: 'cart-button';
profileButton: 'profile-button';
logoLink: 'main-logo';
```

## 🧪 Tests & Qualité

### Lancement des Tests

```bash
# Tests unitaires
pnpm run test

# Tests des Edge Functions Supabase
pnpm run test:edge-functions

# Tests avec couverture
pnpm run coverage

# Tests e2e (Cypress — serveur déjà démarré : API mock 3001 + Vite 8080)
pnpm run e2e:run
# ou en mode interactif
pnpm run e2e:open
# smoke / régression (tags @cypress/grep)
pnpm run e2e:smoke
pnpm run e2e:regression

# Même chose qu’en CI : démarre l’API mock + Vite puis lance Cypress
pnpm run e2e:ci
pnpm run e2e:ci:smoke
```

### Tests pricing-snapshot (Deno)

Le contrat de **pricing snapshot** (mapping Stripe → snapshot v1 stocké en DB et réutilisé pour facture / email de confirmation) est couvert par une suite Deno dédiée. Voir [`supabase/functions/_shared/PRICING_SNAPSHOT.md`](supabase/functions/_shared/PRICING_SNAPSHOT.md) pour le contrat et les règles de versionnement.

**Prérequis :**

- **Deno v2** sur le `PATH` (même version que `pnpm run verify:create-payment`). Vérifier avec `deno --version`.
- Aucune variable d'environnement, clé Supabase ni accès réseau requis — les tests sont 100 % offline et exécutent uniquement la logique de mapping.
- Le script utilise `--allow-env --allow-read=. --no-check --config supabase/functions/deno.json` (lecture des fixtures JSON + import du schéma Zod côté `src/` ; pas de typecheck Deno, pas de lockfile gelé) pour rester aligné avec le bundler hosté de Supabase. **`node scripts/assert-deno-v2.mjs`** échoue vite si Deno n’est pas en v2.

**Checklist offline / sans secrets :**

- [x] **Aucun accès réseau** requis à l'exécution — pure logique de mapping in-memory (les imports `https://deno.land/std@…` sont mis en cache par Deno au premier run, puis réutilisés hors-ligne).
- [x] **Aucune variable d'environnement** requise — ni `SUPABASE_*`, ni `STRIPE_*`, ni `BREVO_*`. Le flag `--allow-env` est présent par confort mais aucun `Deno.env.get(...)` n'est appelé par les tests.
- [x] **Aucun secret / token** à provisionner localement ou en CI — les workflows GitHub n'injectent rien pour ce job.
- [x] **Aucune base de données** — pas de connexion Postgres ni de mock Supabase.
- [x] **Déterministe** — mêmes entrées ⇒ mêmes sorties, indépendant de l'horloge / locale / fuseau.

**Vérification rapide (zéro variable d'environnement requise) :**

```bash
# Doit retourner 0 occurrence dans les fichiers de tests pricing snapshot (hors imports std).
rg -n 'Deno\.env|process\.env|fetch\(' \
  supabase/functions/_shared/pricing-snapshot.ts \
  supabase/functions/_shared/pricing-snapshot_test.ts \
  supabase/functions/_shared/pricing_snapshot_golden_test.ts \
  supabase/functions/_shared/pricing_snapshot_extended_test.ts \
  supabase/functions/_shared/persist-pricing-snapshot_test.ts \
  supabase/functions/stripe-webhook/lib/pricing-snapshot.ts \
  supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts \
  && echo "⚠️  env / network usage detected" \
  || echo "✅  no env vars, no network calls — safe to run offline"
```

Et pour confirmer que la suite passe avec un environnement totalement vide :

```bash
env -i PATH="$PATH" HOME="$HOME" pnpm run test:pricing-snapshot:deno
```

**👉 Commande tout-en-un — vérifier qu'aucune variable d'environnement n'est requise :**

```bash
npm run verify:pricing-snapshot:offline
```

Ce script ([`scripts/verify-pricing-snapshot-offline.mjs`](scripts/verify-pricing-snapshot-offline.mjs)) :

1. Audite statiquement les 6 fichiers de test avec `rg` → échoue si un seul `Deno.env.*` ou `process.env.*` est trouvé.
2. Re-spawne `deno test --cached-only --allow-read=. --no-check` (sans `--allow-env`, sans `--allow-net`) sous `env -i` (POSIX) ou un env minimal (Windows).
3. Imprime un résumé `✓ pass / ✗ fail / ! warn` et sort en code `0` si tout est vert, `1` sinon — utilisable en pre-commit, audit, ou CI.

Sortie attendue (extrait) :

```text
▌ Static audit — no env-var reads in test files
  ✓ no Deno.env / process.env in test files  — 0 matches across 6 files
▌ Runtime — `env -i` + `--cached-only` (no env, no network)
  ✓ deno test (no --allow-env, no --allow-net, --cached-only)  — 26 passed in 842 ms
▌ Summary
  3 passed  ·  0 failed  ·  0 warnings
✓ pricing-snapshot suite is provably offline & env-free
```

**Lancer uniquement les tests pricing snapshot :**

```bash
pnpm run test:pricing-snapshot:deno
```

Fichiers Deno inclus dans **`pnpm run test:pricing-snapshot:deno`** :

- `supabase/functions/_shared/pricing-snapshot_test.ts` — 17 tests (devises, totaux, mapping de lignes, valeurs manquantes, quantités négatives, arrondis, libellés shipping).
- `supabase/functions/_shared/pricing_snapshot_golden_test.ts` — 1 test (`pricing_snapshot_v1.golden.json` + schéma Zod partagé avec le SPA).
- `supabase/functions/_shared/pricing_snapshot_extended_test.ts` — JPY / fixture Stripe anonymisée / volumétrie lignes.
- `supabase/functions/_shared/persist-pricing-snapshot_test.ts` — 1 test avec mocks Stripe + Supabase (`persistPricingSnapshot`).
- `supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts` — ré-export webhook (2 tests).
- `supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts` — helpers email (2 tests).

**Sortie attendue (succès)** — une ligne résumé finale du type :

```
ok | 26 passed | 0 failed (XXms)
```

**Détails du format à connaître :**

- **Une seule ligne `running N tests from ./<path>` par fichier**, dans l'ordre où Deno les charge (ici `stripe-webhook/lib/...` puis `_shared/...`). L'ordre peut varier selon la version de Deno mais reste stable d'un run à l'autre sur la même machine.
- **Un bloc par test** : `<nom du test> ... ok (Xms)`. Les durées entre parenthèses sont **non-déterministes** : la plupart affichent `(0ms)`, certains atteignent quelques `ms` (vu jusqu'à `(25ms)` localement) selon la charge CPU, le cache disque, et la première compilation TypeScript de Deno. C'est pourquoi la doc note historiquement `(XXms)` à la place — n'importe quel entier ≥ 0 suivi de `ms` est valide.
- **Échec d'un test** : la ligne devient `<nom> ... FAILED (Xms)` avec un encart `failures:` listant les tests cassés au-dessus du résumé.
- **Ligne de résumé finale** : précédée d'**une ligne vide**, toujours en **dernière position** de la sortie de `deno test`, au format `ok | <passed> passed | <failed> failed (<total>ms)`. Elle apparaît **après** tous les blocs `running ... from ...` (et non pas une fois par fichier). Pour **`pnpm run test:pricing-snapshot:deno`**, total Deno attendu (agrégé sur tous les fichiers listés ci-dessus) : **`26 passed | 0 failed`** à date — ajuster ce nombre si vous ajoutez/supprimez des `Deno.test`. Pour **`pnpm run test:pricing-snapshot`**, la même suite Deno est suivie de Vitest (`src/lib/checkout/pricingSnapshot.test.ts`). Exit code `0` si tout passe ; sinon **`FAILED | …`** avec exit code `1`, ce qui bloque le job **Deno create-payment** ([`.github/workflows/deno-create-payment.yml`](.github/workflows/deno-create-payment.yml)).

**Exemple de sortie en cas d'échec** — si on casse volontairement une assertion (par exemple `assertEquals(snap.currency, 'usd')` au lieu de `'eur'` dans `_shared/pricing-snapshot_test.ts > currency is normalized to lowercase`), la sortie devient :

```text
running 17 tests from ./supabase/functions/_shared/pricing-snapshot_test.ts
currency is normalized to lowercase ... FAILED (3ms)
defaults currency to eur when missing ... ok (0ms)
total_details fields map to discount/shipping/tax ... ok (1ms)
... (14 autres tests ok)
running 2 tests from ./supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts
buildPricingSnapshotV1FromStripe maps Stripe totals and lines ... ok (0ms)
isShippingLineDescription detects French shipping row ... ok (0ms)
... (autres fichiers identiques)

 ERRORS

currency is normalized to lowercase => ./supabase/functions/_shared/pricing-snapshot_test.ts:10:6
error: AssertionError: Values are not equal.


    [Diff] Actual / Expected


-   eur
+   usd

  throw new AssertionError(message);
        ^
    at assertEquals (https://deno.land/std@0.190.0/testing/asserts.ts:...)
    at file:///.../supabase/functions/_shared/pricing-snapshot_test.ts:17:3

 FAILURES

currency is normalized to lowercase => ./supabase/functions/_shared/pricing-snapshot_test.ts:10:6

FAILED | 25 passed | 1 failed (912ms)

error: Test failed
```

**Ce qui change vs. la sortie verte :**

- Le test cassé passe de `... ok (Xms)` à **`... FAILED (Xms)`** — seul ce test est marqué, les autres restent `ok`.
- Deux nouveaux blocs apparaissent **avant** la ligne de résumé : **`ERRORS`** (stack trace + diff `assertEquals`) puis **`FAILURES`** (liste compacte `<nom> => <fichier>:<ligne>:<col>`, copier-coller-friendly pour ouvrir directement la ligne fautive).
- La ligne de résumé finale passe de **`ok | 26 passed | 0 failed (XXms)`** à **`FAILED | 25 passed | 1 failed (XXms)`** : le préfixe **`ok`** devient **`FAILED`** et le compteur `failed` reflète le nombre exact de tests cassés.
- Une dernière ligne **`error: Test failed`** est imprimée par Deno après le résumé, et le **process sort en exit code `1`** — ce qui fait échouer `pnpm run test:pricing-snapshot:deno`, `npm run verify:pricing-snapshot:offline`, et l'étape **`Deno test checkout pricing helpers`** dans le workflow CI.

**Inspecter les exécutions CI (lien direct) :**

- 📊 **Tous les runs du workflow** : [github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml) — filtrable par branche, statut, acteur. Le badge tout en haut du README pointe au même endroit.
- 🟢 **Dernier run sur `main`** : [actions/workflows/deno-create-payment.yml?query=branch%3Amain](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml?query=branch%3Amain) — utile comme référence "vert connu".
- 🔴 **Derniers échecs uniquement** : [actions/workflows/deno-create-payment.yml?query=is%3Afailure](https://github.com/benmed00/lucid-web-craftsman/actions/workflows/deno-create-payment.yml?query=is%3Afailure) — saute directement aux runs cassés, ouvrir le job `deno` puis l'étape **`Deno test checkout pricing helpers`** (sortie agrégée ; **`26 passed`** Deno attendus si tout est vert — même nombre qu’en local si la liste de fichiers est inchangée).
- 🔍 **Job + étape précis** : sur n'importe quel run ouvert, le bloc qui exécute la suite pricing snapshot s'appelle `deno → Deno test checkout pricing helpers` (logs accessibles à l'URL `…/actions/runs/<run_id>/job/<job_id>#step:7:1`). Cliquer sur le numéro d'étape recopie un lien permanent vers la ligne en erreur — utile à coller dans une PR.
- 📦 **Recherche par PR** : sur l'onglet "Checks" d'une pull request, le check s'appelle exactement `Deno create-payment / deno`. Cliquer dessus ouvre le run + le job déjà déroulé sur l'étape qui a échoué.

> ⚠️ **Note de couverture** : en CI, après **`Assert Deno v2 for pricing helpers`**, l'étape **`Deno test checkout pricing helpers`** exécute les six fichiers Deno listés ci-dessus avec **`--allow-env`**, **`--allow-read`** sur la racine du dépôt, **`--no-check`**, et **`--config deno.json`** (voir [`.github/workflows/deno-create-payment.yml`](.github/workflows/deno-create-payment.yml)). **`pnpm run test:pricing-snapshot`** enchaîne cette même suite puis **Vitest** (`src/lib/checkout/pricingSnapshot.test.ts`, incluant validation du fichier **`pricing_snapshot_v1.golden.json`**). **`pnpm run test:pricing-snapshot:deno`** correspond à la partie Deno uniquement (sans Vitest).

- **Téléchargements** : au tout premier run sur une machine vierge, Deno log `Download https://deno.land/std@0.190.0/...` au-dessus de la sortie (mise en cache locale). Les runs suivants n'affichent plus ces lignes — l'absence ou la présence n'affecte ni le format du résumé ni l'exit code.
- **Pas de couleurs ANSI en CI / pipe** : Deno détecte qu'il n'écrit pas dans un TTY et omet automatiquement les codes couleur ; le format texte ci-dessus reste identique.

Pour la suite complète **Deno (mapping + helpers email) + Vitest (Zod client)** : `pnpm run test:pricing-snapshot`.

#### Préparer le cache Deno pour des runs 100 % hors-ligne

Deno télécharge ses dépendances (`https://deno.land/std@…`, `npm:` et `jsr:` via la map d'imports `supabase/functions/deno.json`) **au premier run**, puis les sert depuis le cache local (`$DENO_DIR`, par défaut `~/.cache/deno` sous Linux/macOS, `%LOCALAPPDATA%\deno` sous Windows). Une fois ce cache amorcé, **`npm run test:pricing-snapshot:deno`** s'exécute sans aucun accès réseau — utile en avion, derrière un proxy strict, ou en CI air-gapped.

**Étape 1 — Premier run en ligne (amorçage du cache) :**

```bash
# Pré-télécharge tous les modules importés par les tests Deno listés dans le script npm,
# en réutilisant la même map d'imports que le test runner.
deno cache --config supabase/functions/deno.json \
  supabase/functions/_shared/pricing-snapshot_test.ts \
  supabase/functions/_shared/pricing_snapshot_golden_test.ts \
  supabase/functions/_shared/pricing_snapshot_extended_test.ts \
  supabase/functions/_shared/persist-pricing-snapshot_test.ts \
  supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts \
  supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts
```

Sortie attendue (la première fois) : une série de lignes `Download https://deno.land/std@0.190.0/...` puis `Download https://jsr.io/@std/assert/...`, sans erreur. Si `deno cache` se termine sans `error:`, le cache est prêt.

> Derrière un proxy d'entreprise : exporter `HTTPS_PROXY` / `HTTP_PROXY` (et au besoin `DENO_CERT=/chemin/ca-bundle.pem`) **avant** la commande `deno cache`. Ces variables ne sont **pas** nécessaires pour les runs offline ultérieurs.

**Étape 2 — Vérifier que tout passe hors-ligne :**

```bash
# Force Deno à n'utiliser que le cache local — échoue si un module manque encore.
DENO_OFFLINE=1 npm run test:pricing-snapshot:deno
# (équivalent manuel : deno test --cached-only --allow-env --allow-read=. --no-check ... )
```

Sortie attendue : strictement la même que décrite dans **Sortie attendue** plus haut (`ok | 26 passed | 0 failed (XXms)`), **sans** aucune ligne `Download ...`. Si vous voyez `error: Specifier not found in cache`, retournez à l'étape 1 avec une connexion : un fichier de test a probablement été ajouté et importe un nouveau module.

**Étape 3 (optionnelle) — Geler le cache pour le partager / l'archiver :**

```bash
# Localiser le cache pour le sauvegarder ou le monter dans une image Docker / runner CI air-gapped.
deno info | grep -i "DENO_DIR"
# Exemple : DENO_DIR location: /home/dev/.cache/deno
tar czf deno-cache.tgz -C "$(deno info --json | jq -r '.denoDir')" .
```

Sur un runner CI offline, restaurer ensuite ce tarball dans `$DENO_DIR` **avant** d'exécuter `npm run test:pricing-snapshot:deno` (qui passe déjà `--no-check` et n'a besoin d'aucun secret — voir la **Checklist offline / sans secrets** ci-dessus).

#### Anatomie des flags `deno test` utilisés

La commande exacte derrière **`npm run test:pricing-snapshot:deno`** est :

```bash
deno test \
  --allow-env \
  --allow-read=. \
  --no-check \
  --config supabase/functions/deno.json \
  supabase/functions/_shared/pricing-snapshot_test.ts \
  …  # (6 fichiers au total)
```

**Aucun** des flags suivants n'est passé : `--allow-net`, `--allow-write`, `--allow-run`, `--allow-sys`, `--allow-ffi`, `--unstable`. Deno applique son modèle « deny-by-default » : toute tentative de réseau, écriture disque, sous-process, etc. provoque immédiatement `PermissionDenied`. C'est cette absence — pas une assertion explicite — qui **garantit** que les tests sont offline et hermétiques.

| Flag                                                                       | Pourquoi présent                                                                                                                                                                                                                                                                                                                                                                                                                                           | Ce qu'il garantit (et ce qu'il **n'**accorde **pas**)                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--allow-env`                                                              | Filet de sécurité pour des modules standard (`@std/assert`, `@std/testing/...`) qui peuvent lire `NO_COLOR`, `CI`, `DENO_NO_PROMPT`, `TERM` pour ajuster leur sortie. **Aucun** test du dossier `pricing-snapshot` n'appelle `Deno.env.get(...)` (vérifié par `npm run verify:pricing-snapshot:offline` + le job CI **« Guard — no env vars / network »**, voir [`.github/workflows/deno-create-payment.yml`](.github/workflows/deno-create-payment.yml)). | Permet à Deno de **lire** des variables d'environnement si elles existent. **Ne rend aucune variable obligatoire** : la commande tourne identiquement sous `env -i …` (variables effacées). Concrètement : pas besoin de `SUPABASE_URL`, `STRIPE_SECRET_KEY`, `BREVO_*`, etc. — aucun secret ni `.env` n'est jamais ouvert.                                               |
| `--allow-read=.`                                                           | Les tests importent des fixtures JSON (`supabase/functions/_shared/fixtures/*.json`) et le schéma Zod côté SPA (`src/lib/checkout/pricingSnapshotSchema.ts`). Sans ce flag, l'import Deno échoue avec `Requires read access`.                                                                                                                                                                                                                              | Lecture **limitée à la racine du dépôt** (le `.` = `cwd` au lancement). Aucun chemin hors-projet n'est lisible (ex. `~/.aws/credentials`, `/etc/passwd`). Pas d'accès **écriture** : impossible de modifier un fichier, donc pas de pollution du worktree pendant les tests.                                                                                              |
| `--no-check`                                                               | Le bundler hosté de Supabase ne fait **pas** de typecheck Deno à l'exécution ; on s'aligne dessus pour éviter qu'un test passe localement (typecheck strict) puis casse en prod. Évite aussi le téléchargement de `lib.deno.d.ts` au premier run, ce qui rendrait le **vrai** premier run impossible offline.                                                                                                                                              | **Aucun** typecheck TypeScript pendant le test (les erreurs de types ne font pas échouer la suite). Les bugs de types sont attrapés ailleurs : `npm run type:check` (Vitest/SPA) et `npm run deno:check:create-payment` (Deno strict, fichiers prod uniquement). N'affecte ni les permissions ni la sécurité — c'est purement une optim de vitesse + portabilité bundler. |
| `--config supabase/functions/deno.json`                                    | Fournit la map d'imports partagée (`@std/assert` → JSR, `npm:@supabase/supabase-js@2`, etc.) pour que les `import` des fichiers de test résolvent les **mêmes** versions que les Edge Functions déployées.                                                                                                                                                                                                                                                 | Garantit la reproductibilité entre local, CI, et prod. **Ne** charge **pas** `deno.lock` racine (volontairement absent de `supabase/functions/`) — le bundler Supabase ne sait pas lire un lockfile v5, voir AGENTS.md.                                                                                                                                                   |
| _(absent)_ `--allow-net`                                                   | Jamais passé. Si un test ajoutait `fetch(...)`, `Deno.connect(...)`, un `WebSocket`, etc., il échouerait avec `PermissionDenied: Requires net access`. Le job CI **Guard** refuse aussi tout commit qui introduirait ces patterns dans les fichiers de test.                                                                                                                                                                                               | **Garantie offline** : impossible que la suite contacte un serveur, un CDN, ou Supabase. Les fixtures sont des littéraux TS / JSON in-memory (voir section **Mettre à jour ou régénérer les fixtures**).                                                                                                                                                                  |
| _(absent)_ `--allow-write` / `--allow-run` / `--allow-sys` / `--allow-ffi` | Jamais passés. Toute tentative d'écrire un fichier, lancer un sous-process, lire `Deno.hostname()`/`Deno.osRelease()`, ou charger une lib native échoue.                                                                                                                                                                                                                                                                                                   | **Hermétisme** : la suite ne laisse aucune trace sur disque (logs, fichiers temporaires, snapshots auto-régénérés). Pas de `Deno.run('git ...')` ou équivalent qui dépendrait de l'environnement hôte.                                                                                                                                                                    |

**Conséquences directes pour la CI / l'offline :**

- **Aucun secret nécessaire** : aucun job, aucun runner, aucun PR contributor n'a besoin de `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, etc. pour exécuter cette suite. Idéal pour les forks et les PR externes (où les secrets GitHub Actions sont masqués).
- **Reproductibilité bit-à-bit** : `env -i deno test ...` (sous Linux/macOS) produit la même sortie que sur le runner GitHub. Si la commande passe en local, elle passe en CI — et inversement.
- **Air-gapped friendly** : combiné avec le cache Deno pré-amorcé (voir **Préparer le cache Deno pour des runs 100 % hors-ligne** ci-dessus), la suite tourne sur un runner sans accès Internet.
- **Vérification automatisée** : `npm run verify:pricing-snapshot:offline` rejoue cette commande sous `env -i` + `--cached-only` et imprime un résumé pass/fail — utile en pre-commit ou lors d'un audit.

> Si vous **devez** ajouter un test qui consomme une variable d'environnement ou qui parle à un service réel, **ne le mettez pas** dans les six fichiers listés ci-dessus : créez un nouveau test dans `supabase/functions/<feature>/` et un script npm dédié. Sinon le job **Guard** de [`.github/workflows/deno-create-payment.yml`](.github/workflows/deno-create-payment.yml) bloquera le merge.

#### Dépannage : `deno` introuvable ou version incompatible

| Symptôme (sortie de `pnpm run test:pricing-snapshot:deno`)                                | Cause probable                                                                                                  | Correctif                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sh: 1: deno: not found` ou `'deno' is not recognized as an internal or external command` | Deno n'est pas installé ou pas dans le `PATH` du shell où `npm` tourne.                                         | Installer Deno **v2** : `curl -fsSL https://deno.land/install.sh \| sh` (Linux/macOS) ou `irm https://deno.land/install.ps1 \| iex` (Windows PowerShell). Puis ajouter `~/.deno/bin` au `PATH` (`export PATH="$HOME/.deno/bin:$PATH"` dans `~/.bashrc` / `~/.zshrc`) et **rouvrir le terminal**.                                                 |
| `deno --version` affiche `1.x.x` au lieu de `2.x.x`                                       | Version trop ancienne (le projet exige Deno 2 — même contrainte que `pnpm run verify:create-payment`).          | Mettre à jour : `deno upgrade` (auto-update vers la dernière stable). Pour épingler explicitement la v2 : `deno upgrade --version 2.x` ou réinstaller avec `DENO_INSTALL=$HOME/.deno sh -c "$(curl -fsSL https://deno.land/install.sh)"`.                                                                                                        |
| `error: Unsupported lockfile version '5'`                                                 | Un vieux Deno (1.x) tente de lire `deno.lock` v5 généré par Deno 2.                                             | Mêmes correctifs que la ligne précédente — passer en Deno 2. Le lockfile racine (`deno.lock`) est intentionnellement v5 ; le bundler hosté de Supabase, lui, ne le lit pas (raisons documentées dans `AGENTS.md`).                                                                                                                               |
| `error: Module not found "https://deno.land/std@0.190.0/..."` au premier run              | Tout premier run sur la machine, pas de cache Deno + accès réseau bloqué (proxy d'entreprise, machine offline). | Lancer **une fois** avec accès réseau pour pré-remplir le cache : `deno cache supabase/functions/_shared/pricing-snapshot_test.ts supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts`. Les runs suivants sont 100 % offline (voir checklist ci-dessus). Derrière un proxy : exporter `HTTPS_PROXY` / `HTTP_PROXY` avant la commande. |
| `error: The module's source code could not be parsed` ou erreurs de typecheck Deno        | `deno test` fait un typecheck par défaut sur des fichiers que le bundler Supabase ne typecheck pas.             | Le script pnpm passe déjà `--no-check` ; si vous lancez `deno test` à la main, **ajouter `--no-check`** : `deno test --allow-env --no-check supabase/functions/_shared/pricing-snapshot_test.ts`.                                                                                                                                                |
| `error: Uncaught (in promise) PermissionDenied: Requires env access`                      | Vous lancez `deno test` à la main sans `--allow-env`.                                                           | Toujours utiliser `--allow-env` (présent dans le script **`pnpm run test:pricing-snapshot:deno`** — certains modules std déclenchent la permission même sans `Deno.env.get`).                                                                                                                                                                    |
| `Expected Deno 2.x` ou message **`[assert-deno-v2]`**                                     | Le pré-script **`node scripts/assert-deno-v2.mjs`** a détecté Deno 1.x ou l’absence de `deno`.                  | Installer / mettre à jour vers Deno **2.x** (`deno upgrade`).                                                                                                                                                                                                                                                                                    |
| `Requires read access` lors des tests avec fixtures                                       | `deno test` sans **`--allow-read`** alors que les tests lisent `fixtures/*.json` ou `src/`.                     | Utiliser la commande **`pnpm run test:pricing-snapshot:deno`** telle quelle (elle inclut **`--allow-read=.`**).                                                                                                                                                                                                                                  |
| Sur Windows : **`pnpm`** introuvable ou `PATH` incomplet après installation Deno          | Conflit de `PATH` ou shell mal rouvert.                                                                         | Vérifier que `node`, **`pnpm`** **et** `deno` sont trouvables : `node -v && pnpm -v && deno --version`. Si seul `deno` manque, ré-exécuter le bloc PowerShell Deno puis relancer PowerShell.                                                                                                                                                     |

**Vérification rapide de la stack avant de relancer :**

```bash
node -v && pnpm -v && deno --version
# Attendu (au minimum) : node v18+, pnpm v9+, deno 2.x.x
```

Si tout est conforme et que le test échoue toujours, voir la section [Inspecter les exécutions CI (lien direct)](#inspecter-les-exécutions-ci-lien-direct) ci-dessus pour comparer la sortie locale avec un run vert connu sur `main`.

#### Mettre à jour ou régénérer les fixtures pricing snapshot

> **TL;DR** — Il n'existe **pas** de pipeline auto de régénération au sens Cypress/Jest (`__snapshots__/`, `--update-snapshots`). Les valeurs attendues dans les tests TypeScript sont des littéraux ou des fichiers JSON versionnés à la main (`supabase/functions/_shared/fixtures/*.json`), puis vérifiés en relançant `pnpm run test:pricing-snapshot:deno`.

**Où vivent les fixtures :**

- `supabase/functions/_shared/pricing-snapshot_test.ts` — 17 cas (devises, totaux, mapping de lignes, valeurs manquantes, quantités négatives, arrondis). Chaque test construit son propre littéral `const session: StripeSessionLike = { ... }` puis appelle `buildPricingSnapshotV1FromStripe(session, lines)` et `assertEquals(...)` sur la sortie attendue.
- `supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts` — 2 cas garantissant que le ré-export depuis `stripe-webhook/` reste compatible (mêmes types, même résultat).
- `supabase/functions/_shared/fixtures/pricing_snapshot_v1.golden.json` — snapshot v1 persisté anonymisé (validation croisée Deno + Vitest / [`pricingSnapshotSchema.ts`](src/lib/checkout/pricingSnapshotSchema.ts)).
- `supabase/functions/_shared/fixtures/stripe_checkout_session_anonymized.json` — session Stripe minimale anonymisée (forme API rapprochée ; mapping uniquement).
- **Contrat** : avant toute modification de forme, lire [`supabase/functions/_shared/PRICING_SNAPSHOT.md`](supabase/functions/_shared/PRICING_SNAPSHOT.md) (versionnement v1, champs obligatoires, règles d'arrondi en minor units).

**Workflow recommandé pour ajouter / modifier un cas :**

1. **Capturer la session Stripe réelle** (optionnel mais recommandé pour les vrais bugs en prod) :
   ```bash
   # Depuis le dashboard Stripe ou via CLI, en mode test (jamais live).
   stripe checkout sessions retrieve cs_test_xxx --expand=line_items.data > /tmp/session.json
   ```
   ⚠️ **Anonymiser** avant de coller dans le test : retirer `customer_details.email`, `customer`, `payment_intent`, `client_reference_id`, et tout `metadata.*` PII. Garder uniquement les champs lus par `buildPricingSnapshotV1FromStripe` (`amount_total`, `amount_subtotal`, `currency`, `total_details.{amount_discount,amount_shipping,amount_tax}`, et pour chaque ligne `description`, `amount_total`, `quantity`).
2. **Réduire au minimum** : un test = un comportement. Inliner uniquement les champs nécessaires — pas la session Stripe complète. Les autres champs sont typés `Partial<...>` côté `StripeSessionLike` et restent optionnels.
3. **Ajouter le `Deno.test(...)` correspondant** dans `_shared/pricing-snapshot_test.ts` (et seulement répliquer dans `stripe-webhook/lib/...` si le test concerne spécifiquement le ré-export). Calculer **à la main** les valeurs attendues en minor units (ex. `12.34 €` ⇒ `1234`) et les écrire en dur dans `assertEquals` — **ne jamais** dériver `expected` depuis un autre appel à la fonction sous test (ce serait un test tautologique).
4. **Vérifier immédiatement** :

   ```bash
   # Relance toute la suite, doit afficher: ok | 20 passed | 0 failed (Xms)
   pnpm run test:pricing-snapshot:deno

   # Variante Vitest (Zod côté client) — utile si la forme du snapshot change.
   pnpm run test:pricing-snapshot
   ```

5. **Cibler un seul test** pendant l'itération (Deno supporte le filtre `--filter`) :
   ```bash
   deno test --allow-env --no-check \
     --filter "currency is normalized to lowercase" \
     supabase/functions/_shared/pricing-snapshot_test.ts
   ```
6. **Mettre à jour le compteur dans la doc** — la section « Sortie attendue » ci-dessus mentionne **`26 passed`** pour **`pnpm run test:pricing-snapshot:deno`** (état du dépôt à maintenir à jour). Si vous ajoutez/supprimez un test, ajustez ce total dans la doc en conséquence.

**Si la forme du snapshot v1 change (champ ajouté / renommé / supprimé) :**

1. **Bumper la version** (`v1` ⇒ `v2`) dans `pricing-snapshot.ts` selon les règles de [`PRICING_SNAPSHOT.md`](supabase/functions/_shared/PRICING_SNAPSHOT.md) — un changement breaking ne doit **jamais** réutiliser `v1`, sinon les snapshots persistés en DB deviennent invalides à la lecture.
2. Mettre à jour **tous** les `assertEquals` en parallèle dans les deux fichiers `*_test.ts`.
3. Mettre à jour le schéma Zod côté client (`src/lib/checkout/pricingSnapshot.ts`) + son test Vitest associé.
4. Relancer `pnpm run test:pricing-snapshot` (Deno + Vitest combinés) — doit passer en intégralité avant ouverture de PR.

**Anti-patterns à éviter :**

- ❌ Ne pas créer de fichier `*.fixture.json` ou de dossier `__snapshots__/` pour ces tests — le contrat veut que les entrées/sorties attendues restent **lisibles dans le test lui-même** (revue de PR ⇒ diff parlant).
- ❌ Ne pas appeler `buildPricingSnapshotV1FromStripe` pour générer la valeur attendue (tautologie, masque les régressions).
- ❌ Ne pas coller une session Stripe brute non-anonymisée — risque de fuite PII en clair dans Git.

**Documentation technique :**

- **[`docs/README.md`](docs/README.md)** — index (liens vers tout le reste).
- **[`docs/PLATFORM.md`](docs/PLATFORM.md)** — architecture, checkout / paiement, isolation vendeur vs admin, **inventaire des routes**.
- **[`docs/STANDARDS.md`](docs/STANDARDS.md)** — qualité (lint, tests, accessibilité, sécurité, OpenAPI / Postman).
- **[`cypress/README.md`](cypress/README.md)** — runbook E2E (commandes, CI, secrets, dépannage ; résumé FR en tête).
- **[`docs/E2E-COVERAGE.md`](docs/E2E-COVERAGE.md)** — couverture Cypress, limites, jobs CI.

Pour les scénarios avec authentification réelle, copier `cypress.env.example.json` vers `cypress.env.json` (voir runbook). En CI, des secrets dépôt `CYPRESS_*` peuvent être configurés (voir `cypress.config.ts`).

**Tests Edge Functions :** Les tests d'intégration des Edge Functions nécessitent `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env`. Pour les tests admin (preview email, etc.), ajoutez `SUPABASE_SERVICE_ROLE_KEY`. Les tests sans clé service role sont ignorés.

### Vérification TypeScript (monorepo)

```bash
pnpm run type:check   # App + Vite config + Cypress
pnpm run validate     # lint + format + typecheck + bundling + Vitest (**toutes** les specs ; voir [docs/STANDARDS.md](docs/STANDARDS.md#validate-vs-testunit-vs-root-github-ci))
pnpm run test:unit    # Vitest comme CI : exclut `rls-e2e.test.ts` + `rls-quick-validation.test.ts` uniquement
```

### Linting & Formatage

```bash
# Vérification du code
pnpm run lint

# Correction automatique (lint)
pnpm run lint:fix

# Formatage Prettier
pnpm run format
```

## 🚢 Déploiement

### Déploiement Automatique (Lovable)

1. Connectez votre compte GitHub
2. Poussez vos modifications sur la branche main
3. Le déploiement se fait automatiquement

### Déploiement Manuel

```bash
# Build de production
pnpm run build

# Prévisualisation du build
pnpm run preview

# Déploiement sur Vercel
vercel --prod
```

### Configuration des Domaines

Pour connecter un domaine personnalisé :

1. Accédez aux paramètres du projet dans Lovable
2. Section "Domains"
3. Ajoutez votre domaine et suivez les instructions DNS

## 🤝 Contribution

### Processus de Contribution

1. **Fork** le repository
2. Créez une **branche feature** (`git checkout -b feature/amazing-feature`)
3. **Committez** vos changements (`git commit -m 'Add amazing feature'`)
4. **Poussez** vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une **Pull Request**

### Standards de Code

- Suivre les règles ESLint configurées
- Utiliser TypeScript pour le typage
- Écrire des tests pour les nouvelles fonctionnalités
- Respecter les conventions de nommage

### Architecture des Composants

- Composants fonctionnels avec hooks
- Props typées avec TypeScript
- Gestion d'état avec Context API
- Styles avec Tailwind CSS

## 🔒 Sécurité

### Bonnes Pratiques Implémentées

- **Authentification** : JWT tokens sécurisés
- **Validation** : Validation côté client et serveur
- **Sanitization** : Protection XSS avec DOMPurify
- **HTTPS** : Chiffrement de toutes les communications
- **CSRF** : Protection contre les attaques CSRF

### Variables Sensibles

- Stockage sécurisé des clés API
- Variables d'environnement pour les secrets
- Rotation régulière des tokens d'accès

## 📈 Performance

### Optimisations Implémentées

- **Code Splitting** : Chargement lazy des composants
- **Image Optimization** : Compression et formats modernes
- **Caching** : Mise en cache intelligente des requêtes
- **Bundle Analysis** : Analyse de la taille des bundles
- **Core Web Vitals** : Optimisation pour les métriques Google

### Monitoring

- Analytics d'utilisation
- Suivi des performances
- Monitoring des erreurs
- Métriques de conversion

## 🌐 Internationalisation

### Langues Supportées

- **Français** (primaire) - Interface principale
- **Arabe** (à venir) - Langue berbère moderne
- **Anglais** (à venir) - Marché international

### Configuration i18n

```typescript
// Configuration locale
export const locales = {
  fr: 'Français',
  ar: 'العربية',
  en: 'English',
};
```

## 📞 Support & Contact

### Équipe de Développement

- **Développeur Principal** : [Votre Nom]
- **Designer UI/UX** : [Nom Designer]
- **Product Owner** : [Nom PO]

### Canaux de Support

- **Issues GitHub** : Bugs et demandes de fonctionnalités
- **Discussions** : Questions générales et idées
- **Email** : <support@rifrawstraw.com>
- **Discord** : Communauté des développeurs

## 📜 Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](./LICENSE) pour plus de détails.

### Droits d'Utilisation

- ✅ Utilisation commerciale
- ✅ Modification du code
- ✅ Distribution
- ✅ Usage privé
- ❌ Responsabilité limitée
- ❌ Garantie limitée

## 🙏 Remerciements

### Crédits

- **Artisans Berbères** - Pour leur savoir-faire authentique
- **Communauté Open Source** - Pour les outils et frameworks
- **Équipe Lovable** - Pour la plateforme de développement
- **Testeurs Bêta** - Pour leurs retours précieux

### Inspirations

- Design inspiré de l'artisanat traditionnel berbère
- Couleurs basées sur les paysages du Rif
- Typographie respectueuse de l'identité culturelle

---

<div align="center">

** Fait avec ❤️ pour préserver et promouvoir l'artisanat berbère **

[Site Web](https://rifrawstraw.lovable.app) • [Documentation](https://docs.rifrawstraw.com) • [Support](mailto:support@rifrawstraw.com)

</div>
