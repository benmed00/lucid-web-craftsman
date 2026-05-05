#!/usr/bin/env bash
# verify-proxy-ca.sh
# -----------------------------------------------------------------------------
# Validation autonome — proxy d'entreprise + CA corporate + résolution DNS +
# accessibilité des registries Deno (jsr.io, deno.land).
#
# Usage:
#   ./scripts/verify-proxy-ca.sh
#
# Variables d'environnement (toutes optionnelles, valeurs par défaut sensées) :
#   HTTP_PROXY / HTTPS_PROXY / NO_PROXY  Proxy d'entreprise (standard Deno/curl)
#   DENO_CERT                            Chemin vers le bundle CA corporate (PEM)
#   DENO_STD_VERSION  (def: 0.224.0)     Version std@ utilisée pour le probe
#   DENO_STD_HOST     (def: deno.land)
#   JSR_HOST          (def: jsr.io)
#   JSR_PROBE_PATH    (def: /@std/assert/meta.json)
#   SKIP_DENO_INFO    (def: 0)           1 = sauter l'étape `deno info`
#                                         (utile si Deno n'est pas installé sur le runner)
#
# Codes de sortie :
#   0  Tous les checks passent
#   1  Variables proxy manquantes
#   2  Résolution DNS impossible pour un host critique
#   3  Échec curl (proxy ou CA)
#   4  Échec deno info (résolution Deno via le proxy)
# -----------------------------------------------------------------------------
set -euo pipefail

: "${DENO_STD_VERSION:=0.224.0}"
: "${DENO_STD_HOST:=deno.land}"
: "${JSR_HOST:=jsr.io}"
: "${JSR_PROBE_PATH:=/@std/assert/meta.json}"
: "${SKIP_DENO_INFO:=0}"

DENO_STD_URL="https://${DENO_STD_HOST}/std@${DENO_STD_VERSION}/assert/mod.ts"
JSR_URL="https://${JSR_HOST}${JSR_PROBE_PATH}"

log()  { printf '[verify-proxy-ca] %s\n' "$*"; }
fail() { printf '[verify-proxy-ca] ❌ %s\n' "$*" >&2; exit "${2:-1}"; }

log "── 1/5 ─ Variables d'environnement"
log "  DENO_STD_VERSION=$DENO_STD_VERSION"
log "  JSR_URL=$JSR_URL"
log "  DENO_STD_URL=$DENO_STD_URL"
if ! env | grep -iE '^(https?_proxy|no_proxy|deno_cert)=' >/dev/null; then
  fail "Aucune variable proxy exportée (HTTP_PROXY/HTTPS_PROXY/NO_PROXY/DENO_CERT)" 1
fi
env | grep -iE '^(https?_proxy|no_proxy|deno_cert)=' \
  | sed -E 's#(://[^:]+:)[^@]+@#\1***@#' # masque les mots de passe inline

log "── 2/5 ─ Résolution DNS (court-circuite le proxy)"
for host in "$JSR_HOST" "$DENO_STD_HOST"; do
  if command -v dig >/dev/null 2>&1; then
    dig +short +time=3 +tries=1 "$host" | grep -Eq '^[0-9a-fA-F.:]+$' \
      || fail "DNS KO pour $host (dig) — vérifier /etc/resolv.conf ou le DNS interne" 2
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$host" >/dev/null 2>&1 \
      || fail "DNS KO pour $host (nslookup)" 2
  elif command -v getent >/dev/null 2>&1; then
    getent hosts "$host" >/dev/null \
      || fail "DNS KO pour $host (getent)" 2
  else
    log "  ⚠ aucun outil DNS dispo (dig/nslookup/getent), check sauté pour $host"
    continue
  fi
  log "  ✓ $host résolu"
done

log "── 3/5 ─ curl HTTPS via proxy + CA (registry JSR)"
curl -fsS -o /dev/null \
  -w "  HTTP %{http_code} en %{time_total}s via %{proxy_used_url:-direct}\n" \
  ${DENO_CERT:+--cacert "$DENO_CERT"} "$JSR_URL" \
  || fail "curl JSR a échoué — vérifier proxy/CA pour $JSR_HOST" 3

log "── 4/5 ─ curl HTTPS deno.land (chaîne TLS différente de jsr.io)"
curl -fsS -o /dev/null -w "  HTTP %{http_code}\n" \
  ${DENO_CERT:+--cacert "$DENO_CERT"} "$DENO_STD_URL" \
  || fail "curl deno.land a échoué — vérifier proxy/CA pour $DENO_STD_HOST" 3

if [ "$SKIP_DENO_INFO" = "1" ]; then
  log "── 5/5 ─ deno info SAUTÉ (SKIP_DENO_INFO=1)"
elif ! command -v deno >/dev/null 2>&1; then
  log "── 5/5 ─ deno info SAUTÉ (binaire 'deno' introuvable sur ce runner)"
else
  log "── 5/5 ─ deno info (résolution + téléchargement réel via le proxy)"
  deno info "$DENO_STD_URL" >/dev/null \
    || fail "deno info a échoué — Deno ne respecte pas le proxy/CA" 4
fi

log "✅ Proxy + CA corporate opérationnels — runner prêt pour les étapes build/test."
