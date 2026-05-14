# DENO_CERT — fournir et valider le bundle CA corporate

Ce document explique **comment configurer `DENO_CERT`** pour que Deno (et les
scripts associés comme [`scripts/verify-proxy-ca.sh`](../scripts/verify-proxy-ca.sh))
acceptent les chaînes TLS interceptées par un proxy d'entreprise (Zscaler,
Netskope, Palo Alto, BlueCoat, etc.).

> TL;DR : `DENO_CERT` doit pointer vers **un fichier PEM** contenant **toute la
> chaîne** (root + intermédiaires) du proxy, en blocs `BEGIN/END CERTIFICATE`
> concaténés. Pas de DER, pas de PKCS#12, pas d'archive.

---

## 1. Format attendu

- **Encodage :** PEM (texte ASCII, base64 entre marqueurs)
- **Extension recommandée :** `.pem` (`.crt` accepté si le contenu est PEM)
- **Contenu :** un ou plusieurs blocs successifs, sans rien entre eux :

  ```text
  -----BEGIN CERTIFICATE-----
  MIIF... (root CA corporate)
  -----END CERTIFICATE-----
  -----BEGIN CERTIFICATE-----
  MIIE... (intermédiaire 1)
  -----END CERTIFICATE-----
  -----BEGIN CERTIFICATE-----
  MIIE... (intermédiaire 2, si applicable)
  -----END CERTIFICATE-----
  ```

- **Ordre :** peu importe pour Deno/OpenSSL — la chaîne est reconstruite par
  sujet/émetteur. Par convention on met la **root** en premier, puis les
  intermédiaires.
- **Fin de ligne :** `LF` (Unix). `CRLF` fonctionne mais évitez les fichiers
  édités sous Notepad sans encodage explicite.
- **Pas de clé privée** dans ce fichier (`BEGIN PRIVATE KEY` = à supprimer).

### Concaténer plusieurs certificats

Si le service IT vous fournit plusieurs `.cer`/`.crt` séparés :

```bash
# Linux / macOS / WSL
cat corp-root.crt corp-intermediate-1.crt corp-intermediate-2.crt > corp-ca-bundle.pem
```

```powershell
# Windows PowerShell
Get-Content corp-root.crt, corp-intermediate-1.crt, corp-intermediate-2.crt `
  | Set-Content -Encoding ascii corp-ca-bundle.pem
```

Si l'un des fichiers est en **DER** (binaire), convertissez-le d'abord :

```bash
openssl x509 -inform DER -in corp-root.cer -out corp-root.pem
```

### Chemin du fichier

- **Linux / macOS / WSL :** `~/.config/deno/corp-ca-bundle.pem`
  (ou `/etc/ssl/certs/corp-ca-bundle.pem` si géré par l'IT).
- **Windows (PowerShell) :** `C:\Users\<user>\.deno\corp-ca-bundle.pem`.
- Évitez les espaces dans le chemin et utilisez un **chemin absolu** quand vous
  exportez la variable.

---

## 2. Exporter la variable

```bash
# bash / zsh — ajouter à ~/.bashrc ou ~/.zshrc
export DENO_CERT="$HOME/.config/deno/corp-ca-bundle.pem"
export HTTPS_PROXY="http://proxy.corp.local:8080"
export HTTP_PROXY="http://proxy.corp.local:8080"
export NO_PROXY="localhost,127.0.0.1,.corp.local"
```

```powershell
# PowerShell — session courante
$env:DENO_CERT     = "$HOME\.deno\corp-ca-bundle.pem"
$env:HTTPS_PROXY   = "http://proxy.corp.local:8080"
$env:HTTP_PROXY    = "http://proxy.corp.local:8080"
$env:NO_PROXY      = "localhost,127.0.0.1,.corp.local"

# Persistant (utilisateur)
[Environment]::SetEnvironmentVariable("DENO_CERT", "$HOME\.deno\corp-ca-bundle.pem", "User")
```

> ⚠️ `DENO_CERT` accepte **un seul chemin**, pas une liste. Si vous avez
> plusieurs sources (root + intermédiaires + CA d'un registry interne),
> **concaténez-les dans un même fichier PEM** comme indiqué plus haut.

---

## 3. Valider le bundle

### 3.1 Vérifier le format et lister les certificats

```bash
# Compter les blocs PEM (doit être ≥ 1)
grep -c 'BEGIN CERTIFICATE' "$DENO_CERT"

# Lister sujet, émetteur et dates pour chaque cert du bundle
awk '
  /-----BEGIN CERTIFICATE-----/ {p=1; cert=""}
  p {cert = cert $0 ORS}
  /-----END CERTIFICATE-----/ {
    print "── Cert #" ++n " ──"
    print cert | "openssl x509 -noout -subject -issuer -dates -fingerprint -sha256"
    close("openssl x509 -noout -subject -issuer -dates -fingerprint -sha256")
    p=0
  }
' "$DENO_CERT"
```

Sortie attendue (extrait) :

```text
── Cert #1 ──
subject= /CN=Corp Root CA/O=Acme Corp
issuer=  /CN=Corp Root CA/O=Acme Corp     ← self-signed = root ✓
notBefore=Jan  1 00:00:00 2020 GMT
notAfter =Jan  1 00:00:00 2040 GMT
SHA256 Fingerprint=AB:CD:...
```

Vérifications :

- Au moins **un certificat root** (sujet == émetteur).
- `notAfter` **dans le futur** (sinon expiré → Deno refusera).
- Le **fingerprint SHA-256** correspond à celui communiqué par votre IT.

### 3.2 Tester un handshake TLS réel via le proxy

```bash
# Sonde JSR (registry utilisé par supabase/functions/deno.json)
curl -v --cacert "$DENO_CERT" \
  --proxy "$HTTPS_PROXY" \
  https://jsr.io/@std/assert/meta.json

# Sonde deno.land/std (chaîne TLS différente)
curl -v --cacert "$DENO_CERT" \
  --proxy "$HTTPS_PROXY" \
  https://deno.land/std@0.224.0/assert/mod.ts
```

Indicateurs de succès :

- `SSL certificate verify ok.` dans la sortie verbeuse.
- HTTP `200` (ou `30x` redirection) — pas `407 Proxy Auth Required` ni
  `SSL_ERROR_*`.

### 3.3 Script de validation tout-en-un (recommandé)

Le projet fournit un script qui enchaîne env vars → DNS → curl JSR/deno.land →
`deno info` :

```bash
# Sortie humaine
./scripts/verify-proxy-ca.sh

# Sortie JSON structurée (CI / support)
./scripts/verify-proxy-ca.sh --json-file=/tmp/verify-proxy-ca.json
```

Codes de sortie : `0` OK · `1` env manquant · `2` DNS KO · `3` curl KO ·
`4` `deno info` KO. Voir l'en-tête de
[`scripts/verify-proxy-ca.sh`](../scripts/verify-proxy-ca.sh) pour le détail.

### 3.4 Vérifier que Deno utilise bien le bundle

```bash
# Doit télécharger sans erreur TLS
deno info https://jsr.io/@std/assert/meta.json
```

Si vous voyez `error sending request ... invalid peer certificate: UnknownIssuer`,
c'est que `DENO_CERT` n'est **pas** lu : revérifiez `echo $DENO_CERT`, le
chemin absolu, et que la variable est exportée dans **le même shell** que la
commande `deno`.

---

## 4. Dépannage rapide

| Symptôme                                         | Cause probable                          | Action                                                              |
| ------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------- |
| `UnknownIssuer` / `unable to get local issuer`   | Bundle incomplet (intermédiaire absent) | Ajouter le cert intermédiaire et re-concaténer                      |
| `PEM routines: no start line`                    | Fichier en DER ou UTF-16/BOM            | Convertir en PEM ASCII (`openssl x509 -inform DER`)                 |
| `407 Proxy Authentication Required`              | Proxy avec auth manquante               | Mettre `http://user:pass@host:port` dans `HTTPS_PROXY`              |
| `curl` OK mais `deno` KO                         | `DENO_CERT` non exporté pour ce shell   | `export DENO_CERT=...` puis relancer dans la **même** session       |
| `notAfter` dans le passé                         | Bundle expiré                           | Demander un nouveau bundle à l'IT                                   |
| Plusieurs CA nécessaires (proxy + registry int.) | `DENO_CERT` = un seul fichier          | **Concaténer** toutes les chaînes dans un même `.pem`               |

---

## 5. Liens

- [`scripts/verify-proxy-ca.sh`](../scripts/verify-proxy-ca.sh) — validation automatisée
- [Deno — Proxies & TLS](https://docs.deno.com/runtime/reference/cli/install/#proxies)
- [`AGENTS.md`](../AGENTS.md) — section *Cursor Cloud specific instructions*
