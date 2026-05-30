
## Objectif

Produire une infographie **autonome, citable et linkable** sur l'artisanat du Rif marocain, déclinée en **PNG haute résolution** (web/blogs) et **PDF A4** (presse), avec un mix patrimoine + impact socio-économique + écologie, fondée sur des chiffres sourcés (UNESCO, Ministère de l'Artisanat marocain, Banque Mondiale, HCP) complétés d'un storytelling visuel.

L'objectif backlink : que blogueurs/journalistes intègrent l'image avec un crédit `Source : rif-elegance.com` (suivi d'un lien follow).

## Livrables

Dans `/mnt/documents/` :
- `rif-artisanat-infographie.png` (1200 × 3200 px, ~72-150 dpi web)
- `rif-artisanat-infographie.pdf` (A4 portrait, vectoriel, imprimable)
- `rif-artisanat-sources.md` — annexe listant chaque chiffre + source + URL (à publier sur le site comme page support pour renforcer la crédibilité du backlink)

## Contenu éditorial (structure verticale)

```text
┌─────────────────────────────────────────┐
│  HEADER — Logo Rif Élégance             │
│  "L'artisanat du Rif en chiffres"       │
│  Sous-titre + crédit rif-elegance.com   │
├─────────────────────────────────────────┤
│  SECTION 1 — PATRIMOINE                 │
│  • Origine du tissage du doum/raphia    │
│  • Régions clés (Chefchaouen, Al        │
│    Hoceïma, Taounate)                   │
│  • Transmission orale & gestuelle       │
├─────────────────────────────────────────┤
│  SECTION 2 — CHIFFRES CLÉS (sourcés)    │
│  Grands stats visuels :                 │
│  • X artisans au Maroc (Min. Artisanat) │
│  • % de femmes artisanes (HCP)          │
│  • Contribution PIB artisanat (BM)      │
│  • Heures de travail / pièce            │
├─────────────────────────────────────────┤
│  SECTION 3 — IMPACT SOCIAL              │
│  • Revenus moyens                       │
│  • Coopératives féminines du Rif        │
│  • Transmission intergénérationnelle    │
├─────────────────────────────────────────┤
│  SECTION 4 — ÉCOLOGIE                   │
│  • Matériaux 100% naturels (doum,       │
│    raphia, laine)                       │
│  • Empreinte carbone ~zéro              │
│  • Comparaison vs fast fashion          │
├─────────────────────────────────────────┤
│  FOOTER — CTA + crédit                  │
│  "Découvrez nos pièces sur              │
│   rif-elegance.com"                     │
│  Sources listées en petit               │
└─────────────────────────────────────────┘
```

## Direction artistique

Cohérente avec la charte Rif Élégance (mémoire projet) :
- **Couleurs** : sable `#E6D3A3`, beige clair `#F5EBD5`, terre `#8B6F47`, vert olive accent `#6B7A4E`, noir charbon pour le texte
- **Typographies** : Playfair Display (titres, 700-800), Inter (corps, 400-500)
- **Iconographie** : pictogrammes line-art fins, dorés sur fond sable — pas d'illustrations photoréalistes (alourdit le fichier et nuit à l'imprimabilité PDF)
- **Style** : éditorial premium, beaucoup de respiration, gros chiffres en Playfair sur fond contrasté

## Approche technique

1. **Recherche sourcée** — `websearch--web_search` ciblé sur : Ministère du Tourisme et de l'Artisanat (MTA) Maroc, HCP (Haut-Commissariat au Plan), UNESCO ICH (Patrimoine immatériel), Banque Mondiale Maroc artisanat, rapports ANAPEC/Maison de l'Artisan. Récupérer **5-8 chiffres vérifiables avec URL** + dates. Si chiffre indisponible, marquer "estimation sectorielle" plutôt qu'inventer.
2. **Génération HTML** — Construire un fichier HTML/CSS standalone (Google Fonts inline, palette en variables CSS) qui rend l'infographie en une page de ~1200 × 3200 px.
3. **Export PNG** — via Playwright (Chromium headless) `page.screenshot({ fullPage: true })` à 2x device pixel ratio pour le retina.
4. **Export PDF** — via Playwright `page.pdf({ format: 'A4' })` avec CSS `@page` adapté ; le contenu vertical long est reformaté en 2 pages A4 grâce à `@media print` (sections page-break).
5. **QA visuelle obligatoire** — convertir PDF → JPG (`pdftoppm`) et inspecter chaque page : pas de débordement, contraste OK, sources lisibles, logo présent, URL claire. Itérer jusqu'à zéro défaut.
6. **Annexe sources** — générer le `.md` listant chaque stat → source → URL → date de consultation.

## Stack sandbox

- `websearch--web_search` pour les sources
- `bun` + Playwright (déjà préinstallé via `npx playwright`) pour render HTML → PNG/PDF
- `pdftoppm` (poppler) pour la QA visuelle
- Pas de dépendance ajoutée au projet — tout se fait dans `/tmp/` et `/mnt/documents/`

## Hors scope (sauf demande)

- Pas de page React intégrée au site (uniquement fichiers téléchargeables)
- Pas de version anglaise/arabe (le contenu est en français — cohérent avec la cible journalistes francophones)
- Pas de modifications du code applicatif

Une fois validé, je passe en build : recherche des sources → génération HTML → export PNG+PDF → QA visuelle → livraison des 3 fichiers dans `/mnt/documents/` prêts à téléverser sur le site.
