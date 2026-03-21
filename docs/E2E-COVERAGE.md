# E2E Cypress — couverture et limites

Guide opérationnel (commandes, CI, secrets, dépannage) : **[`cypress/README.md`](../cypress/README.md)**.

## Scripts utiles

| Script                   | Rôle                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run e2e:ci`         | Mock API (3001) + Vite (8080) + **toute** la suite `cypress run`                                                                       |
| `npm run e2e:ci:shard`   | Idem + **decoupe les fichiers** `cypress/e2e/*` selon `CYPRESS_SHARD` / `CYPRESS_SHARD_TOTAL` (utilisé par le job **e2e-full** en CI). |
| `npm run e2e:ci:smoke`   | Idem + **`@smoke` uniquement** (utilisé par le workflow GitHub Actions)                                                                |
| `npm run e2e:smoke`      | Déjà sous Vite/API lancés : `cypress run --env grep=@smoke`                                                                            |
| `npm run e2e:regression` | Tests tagués `@regression`                                                                                                             |
| `npm run type:check`     | `tsc` sur app, Vite config, Cypress                                                                                                    |

Variables optionnelles : copier `cypress.env.example.json` → `cypress.env.json` pour `CUSTOMER_*`, `ADMIN_*`, `DB_RESET_*`.

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

## Couvert par les specs

- Parcours boutique, panier, checkout, persistance formulaire, auth (classique), OTP **UI**, profil, wishlist, comparaison, blog (dont navigation stubée), résilience API mockée (dont `product_reviews`), mode maintenance (stub `app_settings`), routes paiement / désabonnement, **toutes** les routes `/admin/*` → `/admin/login` sans session, smoke admin dashboard + **parcours optionnel** sur chaque entrée du menu admin **si** `ADMIN_*` est défini, filtres catégories sur `/products`, formulaire d’avis (UI) **si** `CUSTOMER_*` est défini.
- Enterprise : inventaire de routes publiques, formulaires, footer, macro environnement.

## Hors périmètre ou partiel

| Sujet                      | Détail                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Stripe réel**            | Le flux mocké (`payment_success_mocked_spec`) intercepte `order-lookup` ; pas de carte réelle.             |
| **OTP SMS**                | Seul le mode « code » et les boutons sont testés, pas la réception du code.                                |
| **Exit-intent newsletter** | Déclenché après 5 s + sortie souris du haut de page — instable en CI headless ; non automatisé par défaut. |
| **Régression visuelle**    | Pas de Percy / snapshots d’images ; uniquement assertions DOM.                                             |
| **Parallélisation**        | Pas de sharding ni matrix de specs dans le workflow actuel (`e2e.yml` = un seul job Cypress).              |
| **Reset DB serveur**       | `cy.resetDatabase()` utile seulement si `DB_RESET_URL` est défini.                                         |

## Dossier des specs

Tout est sous **`cypress/e2e/`** (plus de dossier `integration/` dupliqué). Les specs peuvent être en **`.js`** ou **`.ts`** (ex. `product_filters_spec.ts`).
