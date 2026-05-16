# Runbook production — checkout, webhook Stripe, e-mail (Brevo), facture

Guide opérationnel pour aligner **Stripe**, **Supabase Edge**, **Brevo** et le **SPA** après un changement d’endpoint, de secrets ou de restriction IP. Les tests automatisés du dépôt ne valident pas ces comptes externes ; ce document standardise les vérifications manuelles.

**Flux résumé :**

```text
Paiement Stripe Checkout
  → stripe-webhook (si signature OK) → confirmOrderFromStripe → send-order-confirmation → Brevo
  → reconcile-payment (filet côté navigateur) → même chaîne e-mail si commande vient d’être confirmée
```

**Facture invité** (`/invoice/...?token=...`) : Edge `generate-invoice` — auth dans le handler (HMAC + JWT owner) ; gateway : [`supabase/config.toml`](../supabase/config.toml) (`verify_jwt = false`) + Bearer anon côté [`src/lib/invoice/generateInvoice.ts`](../src/lib/invoice/generateInvoice.ts).

---

## Vue par phases (plan d’action)

Les phases ci-dessous reprennent la **logique du plan** (ops → déploiement → preuves → prévention → monitoring). Les numéros **§** renvoient aux sections détaillées plus bas.

| Phase       | Objectif                                         | Contenu principal                                                                                                            | Sections (ci-dessous)   |
| ----------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Phase 1** | Débloquer la prod **sans changer le code**       | Brevo (IP / 401) ; Stripe (`whsec` ↔ `STRIPE_WEBHOOK_SECRET`) ; renvoi manuel d’e-mail pour commandes déjà payées            | **§1**, **§2**, **§4**  |
| **Phase 2** | Aligner **Supabase hébergé** avec le repo        | `config.toml` (`verify_jwt` par fonction) ; déploiement des Edge Functions concernées                                        | **§3**                  |
| **Phase 3** | **Preuves** courtes après correctifs             | Webhook 2xx ; logs propres ; `email_logs` ; facture invité                                                                   | **§6**, **§5**          |
| **Phase 4** | **Réduire** la dette « tout chercher à la main » | Ce runbook + [docs/README](./README.md) ; limites E2E ([E2E-COVERAGE](./E2E-COVERAGE.md) : pas de Stripe réel / Brevo en CI) | Document entier, **§8** |
| **Phase 5** | **Alertes** (optionnel)                          | Événements `monitor-payment-events` / `payment_events` si vous les utilisez                                                  | **§7**                  |

**Ordre d’exécution recommandé** (prioriser l’impact utilisateur, puis la « source de vérité » Stripe) :

1. **§1 Brevo** — sinon aucun envoi transactionnel ne peut réussir.
2. **§2 Stripe webhook** — aligner le secret et **Resend** jusqu’à 2xx.
3. **§3 Déploiement** — si `config.toml` ou `confirm-order` / webhooks ont changé dans Git.
4. **§4 Renvoi e-mail** + paiement test — puis **§5** / **§6** pour valider `email_logs` et le parcours complet.
5. **§7 Monitoring** — brancher les alertes si `monitor-payment-events` est en prod.

**À quoi servent les phases (résumé diagnostic) :**

| Symptôme observé                                                       | Piste prioritaire                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Webhook Stripe **400** / `"Invalid signature"`                         | Phase **1** (§2) — `STRIPE_WEBHOOK_SECRET` vs `whsec` de l’endpoint                                                            |
| E-mail absent mais `send-order-confirmation` appelé / **Brevo 401** IP | Phase **1** (§1) — restriction IP Brevo                                                                                        |
| Facture invitée **401** `UNAUTHORIZED_NO_AUTH_HEADER`                  | Phase **2** (§3) + code SPA [`generateInvoice.ts`](../src/lib/invoice/generateInvoice.ts) — gateway `verify_jwt` / Bearer anon |
| Tout semble vert mais historique flou                                  | Phase **3** (§5, §6) — SQL `email_logs` + checklist                                                                            |

**Tests automatisés (repo)** — utiles pour **régressions de code**, pas pour secrets Stripe/Brevo en prod :

| Sujet                                                                                                                                                  | Commande / fichier                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`fetchInvoice`** : `Authorization: Bearer` anon si `session=null`, sinon JWT utilisateur                                                             | `pnpm exec vitest run src/lib/invoice/generateInvoice.fetchInvoice.test.ts` (ou `pnpm run test:unit`) — [`src/lib/invoice/generateInvoice.fetchInvoice.test.ts`](../src/lib/invoice/generateInvoice.fetchInvoice.test.ts) |
| **`sendConfirmationEmail`** : pas d’appel si `email_logs` déjà `sent` ; POST service role vers `send-order-confirmation` ; erreur HTTP absorbée (logs) | `pnpm run test:pricing-snapshot:deno` — [`supabase/functions/_shared/confirm-order_test.ts`](../supabase/functions/_shared/confirm-order_test.ts)                                                                         |
| Confirmation commande + snapshot Stripe (existant)                                                                                                     | Même bundle Deno `confirm-order_test` + Vitest pricing snapshot                                                                                                                                                           |

---

## 1. Brevo — 401 « unrecognised IP address »

**Symptôme :** logs `send-order-confirmation` avec `Brevo error (401)` et une IPv6 ; `email_logs.status = 'failed'`.

**Cause :** restriction **IP autorisées** sur le compte Brevo ; les Edge Functions Supabase sortent depuis des adresses **dynamiques**.

**Actions :**

1. Ouvrir [Brevo — IPs autorisées](https://app.brevo.com/security/authorised_ips).
2. **Recommandé pour Edge Functions :** désactiver la restriction IP pour l’API transactionnelle (`/v3/smtp/email`) **ou** accepter que la whitelist devra être mise à jour régulièrement.
3. Si vous whitelistez ponctuellement : ajouter l’IPv6 indiquée dans l’erreur ; retester immédiatement (une prochaine exécution peut utiliser une autre IP).

**Vérification :**

- Supabase → Logs → `send-order-confirmation` : message de succès d’envoi (plus de 401 Brevo).
- Table `email_logs` : nouvelle ligne `order-confirmation` avec `status = 'sent'` (ou absence d’erreur après retest).

---

## 2. Stripe — webhook `400` / `"Invalid signature"`

**Symptôme :** dans Stripe → Webhooks → livraisons d’événements : **HTTP 400** et corps `"Invalid signature"` (ou équivalent).

**Cause fréquente :** secret **`STRIPE_WEBHOOK_SECRET`** côté Supabase **différent** du **Signing secret** (`whsec_...`) de **l’endpoint Stripe qui reçoit l’événement** (chaque endpoint a son propre `whsec`).

**Actions :**

1. Noter l’**URL exacte** du webhook dans Stripe : `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`.
2. Vérifier que `<project-ref>` correspond au projet Supabase **production** (même projet que les secrets Edge).
3. Stripe → Developers → Webhooks → cet endpoint → **Signing secret** → copier le `whsec_...`.
4. Supabase Dashboard → **Edge Functions → Secrets** (ou CLI `supabase secrets set`) : **`STRIPE_WEBHOOK_SECRET`** = cette valeur, sans guillemets ni espaces.
5. Redéployer la fonction si votre process l’exige : depuis la racine du repo, voir [AGENTS.md](../AGENTS.md) (`deploy:functions:stripe-return`, etc.) et [supabase/README.md](../supabase/README.md).
6. Dans Stripe, utiliser **Resend** sur un événement `checkout.session.completed` jusqu’à obtenir une réponse **2xx**.

**Reference code :** [`supabase/functions/stripe-webhook/index.ts`](../supabase/functions/stripe-webhook/index.ts).

---

## 3. Déploiement Supabase — `config.toml` et fonctions

**Objectif :** la configuration locale [`supabase/config.toml`](../supabase/config.toml) (notamment `verify_jwt` par fonction) doit être **déployée** avec les fonctions pour s’appliquer au projet hébergé.

**À vérifier dans `config.toml` (extrait non exhaustif) :**

- `[functions.generate-invoice] verify_jwt = false`
- `[functions.sign-invoice-token] verify_jwt = false`
- `[functions.stripe-webhook] verify_jwt = false`
- `[functions.send-order-confirmation] verify_jwt = false`

**Commandes types** (CLI Supabase lié au projet ; voir [supabase/README.md](../supabase/README.md)) :

```bash
supabase functions deploy generate-invoice
supabase functions deploy sign-invoice-token
supabase functions deploy stripe-webhook
supabase functions deploy reconcile-payment
supabase functions deploy send-order-confirmation
```

Déployez **reconcile-payment** et **stripe-webhook** après toute modification de [`supabase/functions/_shared/confirm-order.ts`](../supabase/functions/_shared/confirm-order.ts) (logique commune + appel `send-order-confirmation`).

**Paquets npm** : le dépôt expose aussi `pnpm run deploy:functions:stripe-return` / `deploy:functions:payment-success` — voir [AGENTS.md](../AGENTS.md).

---

## 4. Renvoyer l’e-mail de confirmation (commande déjà payée)

Prérequis : Brevo corrigé (section 1).

La fonction attend un corps JSON et un **`Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`** (appel interne).

**Corps minimal** (les totaux et lignes peuvent être simplifiés si `orders.pricing_snapshot` v1 est présent : le handler recharge depuis la DB) :

Champs obligatoires côté handler : `orderId`, `customerEmail`, `customerName`. Ajouter `items`, `subtotal`, `shipping`, `total`, `currency`, `shippingAddress` pour le fallback si pas de snapshot.

Exemple **curl** (remplacer les placeholders ; ne pas commiter la clé) :

```bash
curl -sS -X POST "https://<project-ref>.supabase.co/functions/v1/send-order-confirmation" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"<uuid>\",\"customerEmail\":\"user@example.com\",\"customerName\":\"Nom Client\",\"items\":[],\"subtotal\":0,\"shipping\":0,\"total\":0,\"currency\":\"EUR\",\"shippingAddress\":{\"address\":\"\",\"city\":\"\",\"postalCode\":\"\",\"country\":\"France\"}}"
```

Vous pouvez copier **e-mail / nom** depuis la ligne `email_logs` ou depuis `orders.metadata` / Stripe selon votre trace.

**Collection Postman :** requête « send-order-confirmation » dans [`postman/Lucid-Web-Craftsman.postman_collection.json`](../postman/Lucid-Web-Craftsman.postman_collection.json) ([`postman/README.md`](../postman/README.md)).

**Après envoi :** contrôler `email_logs` (requêtes SQL ci-dessous).

---

## 5. Requêtes SQL de santé (`email_logs`)

À exécuter dans **Supabase SQL Editor** (adapter l’`order_id`).

**Historique pour une commande :**

```sql
select id, template_name, status, error_message, sent_at, created_at
from email_logs
where order_id = '00000000-0000-0000-0000-000000000000'
order by created_at desc
limit 20;
```

**Échecs récents (toutes commandes) :**

```sql
select order_id, template_name, status, left(error_message, 120) as err, created_at
from email_logs
where status = 'failed'
order by created_at desc
limit 50;
```

---

## 6. Vérifications post-correctif (checklist courte)

| Contrôle                                        | Attendu                                                        |
| ----------------------------------------------- | -------------------------------------------------------------- |
| Stripe — livraison `checkout.session.completed` | **2xx**, pas `"Invalid signature"`                             |
| Logs `stripe-webhook`                           | Pas d’erreur de signature                                      |
| Logs `send-order-confirmation`                  | Envoi Brevo OK                                                 |
| `email_logs`                                    | `order-confirmation` en `sent` pour le test                    |
| Facture invité                                  | `/invoice/<uuid>?token=...` sans 401 gateway (session absente) |

---

## 7. Monitoring (optionnel)

Si la fonction **`monitor-payment-events`** est déployée, le dépôt documente des codes utiles (ex. signature webhook invalide) dans [`supabase/functions/monitor-payment-events/README.md`](../supabase/functions/monitor-payment-events/README.md). Brancher ces événements sur vos alertes ops si pertinent.

**Limite des tests CI du repo :** [E2E-COVERAGE.md](./E2E-COVERAGE.md) — **Stripe réel** et e-mail Brevo en prod ne sont pas couverts par Cypress mocké ; ce runbook compense côté procédure.

---

## 8. Secrets et variables à ne pas oublier (liste de travail)

| Secret / variable                                 | Rôle                                                      |
| ------------------------------------------------- | --------------------------------------------------------- |
| `STRIPE_WEBHOOK_SECRET`                           | Vérification signature Stripe (`whsec_...` de l’endpoint) |
| `STRIPE_SECRET_KEY` / clés publiques              | Checkout                                                  |
| `BREVO_API_KEY`                                   | Envoi SMTP API                                            |
| `RESEND_FROM_EMAIL` ou équivalent expéditeur      | Expéditeur Brevo (voir code `send-order-confirmation`)    |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | Edge                                                      |
| `INVOICE_SIGNING_SECRET`                          | Jetons facture / `sign-order-token` / `generate-invoice`  |

Liste sécurité plus large : [docs/security/supabase-production-security-checklist.md](./security/supabase-production-security-checklist.md).
