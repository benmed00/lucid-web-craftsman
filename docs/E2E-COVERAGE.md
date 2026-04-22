# E2E Cypress — couverture et limites

Guide opérationnel (commandes, CI, secrets, dépannage) : **[`cypress/README.md`](../cypress/README.md)**.

Inventaire des **routes** SPA (pour aligner les specs avec `App.tsx`) : **[`docs/PLATFORM.md`](./PLATFORM.md)** · index doc : **[`docs/README.md`](./README.md)**.

## Scripts utiles

| Script                   | Rôle                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run e2e:ci`         | Mock API (3001) + Vite (8080) + **toute** la suite `cypress run`                                                                                 |
| `npm run e2e:ci:shard`   | Idem + **decoupe les fichiers** `cypress/e2e/*` selon `CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL` (utilisé par le job **e2e-full** en CI).           |
| `npm run e2e:ci:smoke`   | Idem + **`@smoke` uniquement** (utilisé par le workflow GitHub Actions)                                                                          |
| `npm run e2e:smoke`      | Déjà sous Vite/API lancés : `cypress run --env grep=@smoke`                                                                                      |
| `npm run e2e:regression` | Tests tagués `@regression`                                                                                                                       |
| `npm run e2e:checkout`   | Mock API + Vite + **checkout** : `checkout_flow_spec`, `checkout_persistence_spec`, `checkout_db_hydration_spec` (rehydratation PostgREST stub). |
| `npm run e2e:contact`    | Mock API + Vite + **`contact_form_spec.js`** uniquement (éviter `cypress run` seul sans SPA sur **8080**).                                       |
| `npm run type:check`     | `tsc` sur app, Vite config, Cypress                                                                                                              |

Variables optionnelles : copier `cypress.env.example.json` → `cypress.env.json` pour `CUSTOMER_*`, `ADMIN_*`, `DB_RESET_*`.

### Checkout UI ↔ specs

- Étape 1 (infos client) : [`src/components/checkout/CustomerInfoStep.tsx`](../src/components/checkout/CustomerInfoStep.tsx) — notamment `data-testid="checkout-continue-to-shipping"` ; l’en-tête du fichier renvoie vers ce guide et [`PLATFORM.md`](./PLATFORM.md).

### CI GitHub Actions (`.github/workflows/e2e.yml`)

Le workflow **[`ci.yml`](../.github/workflows/ci.yml)** (lint, format, `type:check`, tests unitaires, build) **ne lance pas Cypress** ; les E2E sont dans **`e2e.yml`** uniquement.

**Concurrence :** `cancel-in-progress` est activé sur **`e2e.yml`** et sur **`ci.yml`** (nouvelle exécution sur la même branche annule la précédente pour ce workflow).

| Job           | Déclencheurs                                                                                   | Commande                                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **e2e-smoke** | `push` / `pull_request` sur `main`, ou **`workflow_dispatch`** avec input **`suite: smoke`**   | `e2e:ci:smoke` (`@smoke`)                                                                                                                                             |
| **e2e-full**  | `schedule` (lundi 06:00 UTC), ou **`workflow_dispatch`** avec input **`suite: full`** (défaut) | **2 jobs** en parallèle : `e2e:ci:shard` avec `CYPRESS_SHARD` ∈ {1,2}, `CYPRESS_SHARD_TOTAL=2` ([`scripts/cypress-e2e-shard.mjs`](../scripts/cypress-e2e-shard.mjs)). |

Secrets repo **optionnels** (jobs **smoke** et **full**) pour éviter les skips sur les specs qui utilisent `cy.loginAs` / admin : `CYPRESS_ADMIN_EMAIL`, `CYPRESS_ADMIN_PASSWORD`, `CYPRESS_CUSTOMER_EMAIL`, `CYPRESS_CUSTOMER_PASSWORD` — fusion dans `Cypress.env()` via [`cypress.config.ts`](../cypress.config.ts) (`setupNodeEvents`).

### Checklist avant release (recommandé)

1. `npm run validate` (lint, format, `type:check`, tests unitaires) — **sans** Cypress.
2. `npm run e2e:ci` en local avec `cypress.env.json` à jour si vous comptez sur des parcours authentifiés.
3. Sur GitHub : Actions → **E2E** → **Run workflow** — choisir **`suite: full`** (ou **`smoke`** pour un run rapide), ou s’appuyer sur le **`schedule`** hebdomadaire.

### Quand utiliser quel script (W10)

| Script / grep                              | Rôle                                                                                                                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`npm run e2e:ci`** / **`e2e:ci:shard`**  | Suite **complète** locale ou CI (tous les fichiers `cypress/e2e/*`, éventuellement découpée par shard en **e2e-full**).                                                                                                                  |
| **`npm run e2e:ci:smoke`** / `grep=@smoke` | Sous-ensemble **@smoke** sur PR/push — **source principale** de fumée rapide.                                                                                                                                                            |
| **`npm run e2e:enterprise`**               | **Un seul fichier** : [`enterprise_full_platform_spec.js`](../cypress/e2e/enterprise_full_platform_spec.js), souvent avec `CYPRESS_BASE_URL` = preview déployé — macro routes / DOM / blog stub, **sans** refaire tout le détail métier. |

### Propriété des parcours (éviter la duplication)

| Parcours                                                    | Spec « détaillé » (comportement)                                                                                                               | [`enterprise_full_platform_spec.js`](../cypress/e2e/enterprise_full_platform_spec.js)                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Checkout multi-étapes, promo, code postal                   | [`checkout_flow_spec.js`](../cypress/e2e/checkout_flow_spec.js)                                                                                | Smoke mince : écran step 1 avec panier ; `cy.stubCheckoutIntercepts()` dans [`commands.ts`](../cypress/support/commands.ts). |
| Persistance formulaire (reload)                             | [`checkout_persistence_spec.js`](../cypress/e2e/checkout_persistence_spec.js)                                                                  | —                                                                                                                            |
| Rehydratation depuis `checkout_sessions` (invité, stub GET) | [`checkout_db_hydration_spec.ts`](../cypress/e2e/checkout_db_hydration_spec.ts)                                                                | Panier conservé (même `guest_session`) ; clés checkout locales vidées ; `guest_id` lu depuis l’URL interceptée.              |
| Menu mobile, viewports                                      | [`mobile_menu_spec.js`](../cypress/e2e/mobile_menu_spec.js)                                                                                    | Aucun test menu (référence dans le fichier mobile).                                                                          |
| Filtres catégories + recherche vide                         | [`product_filters_spec.ts`](../cypress/e2e/product_filters_spec.ts)                                                                            | Produits : cartes + présence recherche uniquement.                                                                           |
| PDP, détail produit                                         | [`product_detail_spec.js`](../cypress/e2e/product_detail_spec.js)                                                                              | —                                                                                                                            |
| Formulaire contact (`submit-contact`)                       | [`contact_form_spec.js`](../cypress/e2e/contact_form_spec.js)                                                                                  | Enterprise : page `/contact` charge le formulaire ; détail + intercept `**/functions/v1/submit-contact` ici.                 |
| Auth / inscription                                          | [`auth_flows_spec.js`](../cypress/e2e/auth_flows_spec.js)                                                                                      | `/auth` couvert par l’inventaire `PUBLIC_ROUTES` + auth_flows.                                                               |
| Admin                                                       | [`admin_routes_smoke_spec.js`](../cypress/e2e/admin_routes_smoke_spec.js), [`admin_dashboard_spec.js`](../cypress/e2e/admin_dashboard_spec.js) | —                                                                                                                            |

## Couvert par les specs

- Parcours boutique, panier, checkout, persistance formulaire, **rehydratation checkout DB** (invité, `checkout_sessions` stub), auth (classique), OTP **UI**, profil, wishlist, comparaison, blog (dont navigation stubée), résilience API mockée (dont `product_reviews`), mode maintenance (stub `app_settings`), routes paiement / désabonnement, **toutes** les routes `/admin/*` → `/admin/login` sans session, smoke admin dashboard + **parcours optionnel** sur chaque entrée du menu admin **si** `ADMIN_*` est défini, filtres catégories sur `/products`, formulaire d’avis (UI) **si** `CUSTOMER_*` est défini, **isolation storefront élevée** (panier / wishlist locaux, pas de `sync_cart`) **si** `ADMIN_*` ou `CUSTOMER_*` — [`elevated_storefront_spec.ts`](../cypress/e2e/elevated_storefront_spec.ts).
- Enterprise : inventaire de routes publiques, formulaires, footer, macro environnement.

## Hors périmètre ou partiel

| Sujet                      | Détail                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe réel**            | Le flux mocké (`payment_success_mocked_spec.ts`) intercepte `order-lookup` (succès immédiat + chemin **pending → paid** avec poll) ; pas de carte réelle. |
| **OTP SMS**                | Seul le mode « code » et les boutons sont testés, pas la réception du code.                                                                               |
| **Exit-intent newsletter** | Déclenché après 5 s + sortie souris du haut de page — instable en CI headless ; non automatisé par défaut.                                                |
| **Régression visuelle**    | Pas de Percy / snapshots d’images ; uniquement assertions DOM.                                                                                            |
| **Parallélisation**        | Le job **e2e-full** lance **2 shards** (`e2e:ci:shard`) ; le job **e2e-smoke** reste **monolithique**.                                                    |
| **Reset DB serveur**       | `cy.resetDatabase()` utile seulement si `DB_RESET_URL` est défini.                                                                                        |

## Dossier des specs

Tout est sous **`cypress/e2e/`** (plus de dossier `integration/` dupliqué). Les specs peuvent être en **`.js`** ou **`.ts`** (ex. `product_filters_spec.ts`, `payment_success_mocked_spec.ts`).
