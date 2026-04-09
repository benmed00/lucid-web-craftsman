
## 🔍 Audit — État actuel du système Auth & RBAC

### ✅ Ce qui fonctionne bien (ne pas toucher)

| Composant | Statut | Détail |
|-----------|--------|--------|
| **AuthContext** | ✅ Solide | Session init avec timeout 4s, retry, JWT validation, cross-tab sync |
| **`user_roles` table** | ✅ Correct | Rôles séparés (admin, super_admin), `revoked_at` pour révocation |
| **`has_role()` / `is_admin_user()`** | ✅ SECURITY DEFINER | Fonctions stables, initplan-optimisées |
| **RLS policies** | ✅ Complètes | 40+ policies couvrant toutes les tables |
| **`verify_admin_session()` RPC** | ✅ Server-side | Vérification admin non-spoofable |
| **`useAdminAuth` hook** | ✅ Sécurisé | Utilise RPC server-side, pas localStorage |
| **ProtectedAdminRoute** | ✅ Fonctionnel | Guard basé sur `useAdminAuth` |

### ⚠️ Incohérences identifiées (à corriger)

1. **Double source admin** : `verify_admin_session()` lit `admin_users`, mais `is_admin_user()` lit `user_roles`. Si un user est dans l'un mais pas l'autre → comportement incohérent.
   - **Fix** : Aligner `verify_admin_session()` pour utiliser `user_roles` au lieu de `admin_users`

2. **Pas de rôle dans AuthContext** : Le frontend ne connaît le rôle qu'en appelant `useAdminAuth` séparément. Risque de requêtes dupliquées.
   - **Fix** : Ajouter `role: 'anonymous' | 'user' | 'admin' | 'super_admin'` dans AuthContext

3. **Logging insuffisant** : Pas de traces pour les changements de rôle ou accès refusés.
   - **Fix** : Ajouter console.info pour role detection au login

### ❌ Non-problèmes (confirmé sécurisé)

- Pas de rôle stocké en localStorage ✅
- Pas de check admin client-side ✅
- RLS utilise `(SELECT auth.uid())` initplan ✅
- Anon bloqué sur tables sensibles ✅

### 📋 Plan de correction (3 changements ciblés)

1. **Migration SQL** : Mettre à jour `verify_admin_session()` pour lire `user_roles` au lieu de `admin_users`
2. **AuthContext** : Ajouter `role` dérivé du backend (via une fonction RPC légère)
3. **Logging** : Ajouter traces role detection dans `useAdminAuth`

Temps estimé : ~15 min. Aucun changement UX.
