
# Installer Google Tag Manager (GTM-W37MDPNB)

## Objectif
Injecter l'extrait GTM sur toutes les pages du site.

## Changements

### `index.html`

1. **Dans `<head>`, le plus haut possible** (juste après `<meta charset>` / viewport, avant les autres scripts) — snippet GTM inline :
   ```html
   <!-- Google Tag Manager -->
   <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
   new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
   j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
   'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
   })(window,document,'script','dataLayer','GTM-W37MDPNB');</script>
   <!-- End Google Tag Manager -->
   ```

2. **Juste après `<body>`** — fallback noscript (obligatoirement dans `<body>`, jamais dans `<head>` selon les règles Lovable) :
   ```html
   <!-- Google Tag Manager (noscript) -->
   <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W37MDPNB"
   height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
   <!-- End Google Tag Manager (noscript) -->
   ```

### CSP (`index.html` `<meta http-equiv="Content-Security-Policy">`)

Autoriser les domaines GTM :
- `script-src` : ajouter `https://www.googletagmanager.com`
- `img-src` : ajouter `https://www.googletagmanager.com` (pixels de tags Google)
- `connect-src` : ajouter `https://www.googletagmanager.com` et `https://www.google-analytics.com` (si GA4 sera loggé via GTM)
- `frame-src` : ajouter `https://www.googletagmanager.com` (iframe noscript)

Si tu prévois d'ajouter GA4, Ads, Meta, TikTok via GTM plus tard, on étendra la CSP à ce moment-là.

## Hors périmètre
- Pas de configuration de conteneur GTM côté Google (à faire dans l'interface GTM).
- Pas de bandeau consentement / Consent Mode v2 — à traiter séparément si besoin RGPD (recommandé avant d'activer des tags marketing).
- Pas de push `dataLayer` custom (events e-commerce type `add_to_cart`, `purchase`) — à faire dans une phase suivante si tu veux tracker les événements checkout.

## Validation
- Charger le site → onglet Réseau : vérifier `gtm.js?id=GTM-W37MDPNB` (200 OK).
- Extension **Tag Assistant** de Google : conteneur détecté.
- Console : aucune violation CSP.
