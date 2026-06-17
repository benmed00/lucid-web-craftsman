# Plan : Crossfade élégant sur la hero image

## Objectif
Éliminer le "flash" visible quand l'image Supabase remplace l'image par défaut après 3s, en ajoutant une transition opacity douce. La stratégie de chargement actuelle (render-first, fetch-later 3s) est **conservée intacte** pour préserver le LCP.

## Comportement cible

```text
T=0      → Image A (défaut/cache) visible, opacity 1
T=3000   → fetch Supabase déclenché
T=~3200  → Image B montée en overlay, opacity 0 → 1 sur 600ms
T=~3800  → Image A retirée du DOM, seule Image B reste
```

Aucun flash, aucun layout shift (même conteneur, même aspect-ratio 4/5).

## Changements

### 1. `src/components/HeroImage.tsx` — superposer A et B avec crossfade

Au lieu de rendre soit le bloc "loading" soit le bloc "loaded", on rend **toujours les deux images dans le même conteneur** en position absolue, et on contrôle leur opacité :

- Conteneur `relative` avec `aspect-ratio: 4/5`
- **Image A** (défaut) : `absolute inset-0`, visible tant que B n'est pas chargée
- **Image B** (Supabase) : `absolute inset-0`, `opacity-0` au départ, passe à `opacity-100` quand `onLoad` se déclenche, avec `transition-opacity duration-700 ease-out`
- Une fois B affichée pendant ~1s, on peut retirer A du DOM (state `hideDefault`) pour libérer la mémoire — optionnel, low priority

### 2. `src/hooks/useHeroImage.ts` — exposer un flag de "fresh fetch"

Ajouter un état `hasFetchedRemote: boolean` qui passe à `true` quand le `setTimeout` de 3s résout avec succès. Permet à `HeroImage` de savoir quand monter l'image B pour la première fois (vs cache localStorage qui était déjà la "bonne" image dès T=0 — dans ce cas, pas de crossfade nécessaire).

**Logique de décision dans le composant :**
- Si `heroImageData.imageUrl === defaultImageUrl` → on n'est qu'à l'image par défaut, en attente
- Si `heroImageData.imageUrl !== defaultImageUrl` ET pas encore monté → c'est l'image Supabase, monter avec crossfade
- Si cache localStorage présent dès le départ → image Supabase rendue direct, pas de A visible

### 3. Overlays (titre, gradient, hover hint)

Les overlays actuels (gradient bottom, carte de titre, hint hover) sont aujourd'hui dupliqués entre les deux branches `isLoading` / loaded. On les **factorise** dans un seul bloc rendu une fois, par-dessus le conteneur d'images. Réduction de duplication + cohérence visuelle pendant le crossfade.

## Détails techniques

- Utiliser `transition-opacity duration-700 ease-out` (Tailwind) — durée généreuse pour un effet premium, cohérent avec l'esthétique sable/terre du projet.
- L'image B garde `fetchpriority="high"` (déjà le cas via `HeroImageComponent` avec `preload={true}`).
- L'image A garde aussi `fetchpriority="high"` car c'est elle le LCP au premier rendu.
- `onLoad` sur l'image B déclenche `setBLoaded(true)` qui passe l'opacité à 1.
- Pas de modification du `useHeroImage` autre que l'ajout du flag (signature publique inchangée pour les autres consommateurs comme `AdminHeroImage`).
- Pas de changement aux autres composants, services, ou config.

## Fichiers touchés

| Fichier | Type | Portée |
|---|---|---|
| `src/components/HeroImage.tsx` | edit | Restructure le JSX : 2 images en absolute, opacity contrôlée, overlays factorisés |
| `src/hooks/useHeroImage.ts` | edit | Ajoute `hasFetchedRemote` dans le retour du hook |

## Hors scope (volontairement)
- Pas de changement de la stratégie 3s deferred fetch (memory: `useHeroImage` strategy).
- Pas de changement du LCP / preload (déjà optimisé dans la session précédente).
- Pas de changement de `AdminHeroImage` (consomme `useHeroImage` mais n'utilise pas le nouveau flag).
- Pas de modification de la transformation Supabase Storage (`width=1200&quality=75` déjà en place).

## Risques
- **Très faible.** Modifications purement de présentation, dans un seul composant + un champ retourné par un hook. Pas de logique métier, pas de schéma, pas de network, pas de cache. Réversible en 1 revert.
