# Analyse du Workflow Produit - Améliorations Nécessaires

## État Actuel vs Requis

### 1. GESTION STOCK CLIENT-SIDE

**Manquant :**

- Affichage stock sur ProductCard
- Messages d'alerte "Il ne reste que X pièces"
- Limitation quantité selon stock disponible
- Indicateur "Rupture de stock" / "Dernières pièces"

**À Implémenter :**

```typescript
// Dans ProductCard.tsx
{product.stock_quantity <= 3 && product.stock_quantity > 0 && (
  <Badge variant="warning">Il ne reste que {product.stock_quantity} pièce(s)</Badge>
)}
{product.stock_quantity === 0 && (
  <Badge variant="destructive">Rupture de stock</Badge>
)}
```

### 2. GESTION DISPONIBILITÉ PRODUITS

**Manquant :**

- Champ `is_active` ou `is_available` distinct de `is_new`
- Toggle disponibilité dans AdminProducts
- Filtre par disponibilité dans la boutique

**Migration DB Requise :**

```sql
ALTER TABLE products ADD COLUMN is_available BOOLEAN DEFAULT true;
```

### 3. LOGIQUE LIVRAISON RÉGIONALE

**Manquant :**

- Détection zone Nantes métropole
- Calcul frais de port par zone
- Affichage délais de livraison dynamiques

**À Implémenter :**

- Service de géolocalisation/codes postaux
- Logic de frais de port adaptatifs
- Composant DeliveryInfo dans ProductDetail

### 4. INTÉGRATION STOCK DANS L'UX

**Pages à Modifier :**

- ProductCard.tsx → Affichage stock
- ProductDetail.tsx → Limitation quantité, alertes
- Cart.tsx → Vérification stock lors ajout
- Checkout.tsx → Validation stock finale

### 5. AMÉLIRATIONS ADMIN

**AdminInventory Existant :**

- Interface déjà créée mais données mock
- Intégrer avec vraie base Supabase
- Ajout alertes automatiques stock faible

## Priorités d'Implémentation

### Phase 1 - Stock Client (Critique)

1. Affichage stock sur cartes produits
2. Alertes "dernières pièces"
3. Limitation quantité dans ProductDetail
4. Vérifications stock dans le panier

### Phase 2 - Disponibilité Produits

1. Champ is_available en DB
2. Toggle admin disponibilité
3. Filtres boutique par disponibilité

### Phase 3 - Livraison Régionale

1. Service géolocalisation
2. Calcul frais port par zone
3. Messages livraison gratuite Nantes
4. Délais livraison dynamiques

## Impact UX Attendu

**Avant :** Client peut commander des produits indisponibles
**Après :** Expérience transparente avec info stock en temps réel

**Avant :** Frais de port fixes
**Après :** Livraison gratuite valorisée pour métropole Nantaise

**Avant :** Délais génériques
**Après :** Estimation précise selon localisation
