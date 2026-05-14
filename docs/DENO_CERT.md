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

## 5. CI air-gapped (job offline)

Pour **prouver** que la suite Deno tourne sans réseau (utile en environnement
restreint et pour détecter les régressions qui ré-introduisent un fetch
distant), un exemple de workflow est fourni :

→ [`.github/workflows/deno-offline.yml.example`](../.github/workflows/deno-offline.yml.example)

Principes appliqués :

1. **`env -i`** — l'étape de test repart d'un environnement **vide** : pas de
   `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `DENO_CERT`, ni `DENO_AUTH_TOKENS`.
   Seuls `PATH`, `HOME` et `DENO_DIR` sont ré-injectés.
2. **`DENO_OFFLINE=1`** + **`deno test --cached-only`** — Deno refuse tout
   fetch ; il échoue immédiatement si une dépendance n'est pas déjà dans le
   cache `DENO_DIR`.
3. **Cache pré-hydraté obligatoire** — `DENO_DIR` est restauré depuis un
   artifact ou `actions/cache`. Si vide, le job échoue avant même de lancer
   les tests (message clair : « hydrate le cache »).
4. **Scan post-mortem des logs** — `rg` cherche les patterns réseau interdits
   (`Download https?://`, `error sending request`, `tcp connect error`,
   `dns error`, `UnknownIssuer`, `Network is unreachable`, …). Toute occurrence
   fait échouer le job, même si `deno test` est sorti avec `0`.
5. **Artifact log** — la sortie complète est uploadée (`deno-offline-log`)
   pour audit/support.

Pour activer le job dans le repo, copiez le fichier en retirant le suffixe
`.example` :

```bash
cp .github/workflows/deno-offline.yml.example .github/workflows/deno-offline.yml
```

Adaptez la liste des fichiers de test passés à `deno test` selon votre scope
(par défaut : pricing-snapshot helpers, alignés avec
[`scripts/verify-pricing-snapshot-offline.mjs`](../scripts/verify-pricing-snapshot-offline.mjs)).

> 💡 **Hydrater le cache** : avant ce job, prévoyez une étape (ou un job amont)
> qui exécute `deno cache --config supabase/functions/deno.json <fichiers>`
> avec accès réseau, puis publie `DENO_DIR` via `actions/cache` ou
> `actions/upload-artifact`.

---

## 6. Identifier et partager `$DENO_DIR` (parité CI ⇄ local)

Pour que **`scripts/deno-mode-toggle.sh offline`** et le job
[`deno-offline.yml`](../.github/workflows/deno-offline.yml.example) servent
exactement le même cache que vos runs locaux, il faut s'assurer que **la
valeur de `DENO_DIR` est identique** (ou au moins équivalente en contenu) des
deux côtés.

### 6.1 Identifier la valeur effective

Deno utilise, par ordre de priorité :

1. La variable d'environnement **`DENO_DIR`** si elle est définie,
2. Sinon un répertoire par défaut dépendant de l'OS.

```bash
# Valeur effective utilisée par Deno (résout les défauts par OS)
deno info | grep -E '^DENO_DIR'

# Variable explicitement exportée dans votre shell (peut être vide)
echo "DENO_DIR=${DENO_DIR:-<unset → defaults>}"

# Taille et contenu de premier niveau
DD="$(deno info | awk -F': ' '/^DENO_DIR/{print $2}')"
du -sh "$DD" && ls "$DD"
```

Défauts par OS (si `DENO_DIR` n'est pas exportée) :

| OS              | Chemin par défaut                                            |
| --------------- | ------------------------------------------------------------ |
| Linux / WSL     | `~/.cache/deno`                                              |
| macOS           | `~/Library/Caches/deno`                                      |
| Windows         | `%LOCALAPPDATA%\deno` (`C:\Users\<u>\AppData\Local\deno`)    |

> ⚠️ **Piège fréquent :** en local vous utilisez le défaut OS, en CI le job
> exporte `DENO_DIR=$GITHUB_WORKSPACE/.deno-cache`. Les deux caches existent
> mais ne contiennent pas la même chose → divergence silencieuse.
> **Règle :** exporter `DENO_DIR` explicitement des deux côtés, vers un chemin
> **dans le repo** (ex. `./.deno-cache`) — pas dans `~/.cache`.

### 6.2 Partager le cache (export / import)

```bash
# Empaqueter le cache local pour le pousser en CI ou à un collègue
tar -C "$(dirname "$DENO_DIR")" -czf deno-cache.tgz "$(basename "$DENO_DIR")"
sha256sum deno-cache.tgz   # à communiquer pour vérif d'intégrité

# Restaurer côté destinataire (CI ou autre poste)
mkdir -p ./.deno-cache
tar -C . -xzf deno-cache.tgz
export DENO_DIR="$(pwd)/.deno-cache"
```

En GitHub Actions, le partage se fait via **`actions/cache`** avec une clé
déterministe à partir des fichiers de config :

```yaml
- uses: actions/cache@v4
  with:
    path: ${{ env.DENO_DIR }}
    key: deno-cache-v1-${{ runner.os }}-${{ hashFiles('supabase/functions/**/deno.json', 'deno.lock') }}
    restore-keys: deno-cache-v1-${{ runner.os }}-
```

**Règles d'or pour la clé de cache :**

- Inclure **`runner.os`** (un cache Linux n'est pas valide sur macOS/Windows).
- Inclure le **hash de tous les `deno.json` + `deno.lock`** : si une
  dépendance bouge, on invalide.
- Versionner avec un préfixe (`v1`, `v2`) pour pouvoir invalider à la main.

### 6.3 Checklist parité CI ⇄ local

Avant de conclure « ça marche en local mais pas en CI » (ou l'inverse),
vérifier les **4 invariants** suivants — exécuter les mêmes commandes des
deux côtés et comparer :

| # | Invariant                              | Commande                                                                                   |
| - | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1 | Version Deno identique                 | `deno --version`                                                                           |
| 2 | `DENO_DIR` au même endroit *(relatif au repo)* | `deno info \| grep DENO_DIR`                                                       |
| 3 | Mêmes `deno.json` + `deno.lock`        | `git status supabase/functions/**/deno.json deno.lock` (doit être propre)                  |
| 4 | Empreinte du cache identique           | `find "$DENO_DIR" -type f -name '*.metadata.json' \| sort \| xargs sha256sum \| sha256sum` |

L'invariant **4** produit une empreinte unique du cache (toutes les metadata
JSON de Deno triées + hashées). Si CI et local renvoient le **même hash**,
les caches sont équivalents.

> 💡 Le script [`scripts/deno-mode-toggle.sh verify-cache`](../scripts/deno-mode-toggle.sh)
> automatise une partie : il confirme qu'aucun téléchargement n'a eu lieu en
> mode offline et que chaque host fetché en mode online a bien un répertoire
> dans `DENO_DIR`.

### 6.4 Symptômes de désynchronisation

| Symptôme en CI                                       | Cause probable                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `error: Module not found` (alors que ça passe local) | `deno.lock` modifié sans rejouer `deno cache`                            |
| `Specifier not found in cache`                       | Cache CI restauré depuis une clé périmée                                 |
| Hash invariant #4 différent                          | Versions Deno différentes, ou cache local pollué par d'autres projets    |
| `deno test` télécharge en CI mais pas en local       | `DENO_DIR` non exporté en CI → utilise `~/.cache/deno` (vide)            |

---

## 7. Liens

- [`scripts/verify-proxy-ca.sh`](../scripts/verify-proxy-ca.sh) — validation automatisée
- [`.github/workflows/deno-offline.yml.example`](../.github/workflows/deno-offline.yml.example) — job CI air-gapped
- [Deno — Proxies & TLS](https://docs.deno.com/runtime/reference/cli/install/#proxies)
- [Deno — `--cached-only` & `DENO_OFFLINE`](https://docs.deno.com/runtime/reference/cli/run/#--cached-only)
- [`AGENTS.md`](../AGENTS.md) — section *Cursor Cloud specific instructions*
