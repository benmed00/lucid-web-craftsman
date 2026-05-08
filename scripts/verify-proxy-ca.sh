#!/usr/bin/env bash
# verify-proxy-ca.sh
# -----------------------------------------------------------------------------
# Validation autonome — proxy d'entreprise + CA corporate + résolution DNS +
# accessibilité des registries Deno (jsr.io, deno.land).
#
# Usage:
#   ./scripts/verify-proxy-ca.sh                   # sortie humaine
#   ./scripts/verify-proxy-ca.sh --json            # sortie JSON structurée (stdout)
#   ./scripts/verify-proxy-ca.sh --json-file=PATH  # JSON écrit dans PATH
#                                                    (sortie humaine sur stderr)
#
# Variables d'environnement (toutes optionnelles) :
#   HTTP_PROXY / HTTPS_PROXY / NO_PROXY  Proxy d'entreprise (standard Deno/curl)
#   DENO_CERT                            Chemin vers le bundle CA corporate (PEM)
#   DENO_STD_VERSION  (def: 0.224.0)
#   DENO_STD_HOST     (def: deno.land)
#   JSR_HOST          (def: jsr.io)
#   JSR_PROBE_PATH    (def: /@std/assert/meta.json)
#   SKIP_DENO_INFO    (def: 0)           1 = sauter l'étape `deno info`
#
# Codes de sortie :
#   0  OK   |  1  vars manquantes  |  2  DNS KO  |  3  curl KO  |  4  deno KO
#
# Format JSON (stable — versionné via "schema") :
# {
#   "schema": "verify-proxy-ca/v1",
#   "ok": false,
#   "exit_code": 3,
#   "failed_step": "curl_jsr",
#   "config": { "deno_std_version": "...", "jsr_url": "...", "deno_std_url": "..." },
#   "checks": [
#     { "id": "env",        "name": "Variables d'environnement", "ok": true  },
#     { "id": "dns",        "name": "Résolution DNS",            "ok": true,
#       "hosts": [ { "host": "jsr.io", "ok": true, "tool": "dig" }, ... ] },
#     { "id": "curl_jsr",   "name": "curl JSR",        "ok": false,
#       "url": "...", "http_code": 407, "time_total_s": 0.42, "error": "..." },
#     { "id": "curl_deno",  "name": "curl deno.land",  "ok": null, "skipped": true },
#     { "id": "deno_info",  "name": "deno info",       "ok": null, "skipped": true }
#   ]
# }
# -----------------------------------------------------------------------------
set -uo pipefail

: "${DENO_STD_VERSION:=0.224.0}"
: "${DENO_STD_HOST:=deno.land}"
: "${JSR_HOST:=jsr.io}"
: "${JSR_PROBE_PATH:=/@std/assert/meta.json}"
: "${SKIP_DENO_INFO:=0}"

DENO_STD_URL="https://${DENO_STD_HOST}/std@${DENO_STD_VERSION}/assert/mod.ts"
JSR_URL="https://${JSR_HOST}${JSR_PROBE_PATH}"

# ── Mode de sortie ───────────────────────────────────────────────────────────
JSON_MODE=0
JSON_FILE=""
for arg in "$@"; do
  case "$arg" in
    --json) JSON_MODE=1 ;;
    --json-file=*) JSON_MODE=1; JSON_FILE="${arg#*=}" ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
  esac
done

# Quand on émet du JSON sur stdout, les logs humains vont sur stderr pour ne
# pas polluer le flux structuré.
if [ "$JSON_MODE" = "1" ] && [ -z "$JSON_FILE" ]; then
  LOG_FD=2
else
  LOG_FD=1
fi
log() { printf '[verify-proxy-ca] %s\n' "$*" >&"$LOG_FD"; }

# ── Accumulation des résultats (tableaux parallèles) ─────────────────────────
CHECK_IDS=()    # id machine
CHECK_NAMES=()  # libellé humain
CHECK_OKS=()    # "true" | "false" | "null" (skipped)
CHECK_META=()   # JSON object (sans accolades extérieures) avec champs propres

record() {
  # record <id> <name> <ok:true|false|null> <meta-json-fragment>
  CHECK_IDS+=("$1"); CHECK_NAMES+=("$2"); CHECK_OKS+=("$3"); CHECK_META+=("$4")
}

json_escape() {
  # Échappement JSON minimal d'une string bash.
  local s=${1//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

emit_json_and_exit() {
  local code="$1" failed_id="$2"
  local ok="true"; [ "$code" -ne 0 ] && ok="false"
  local out
  out=$(printf '{\n')
  out+=$(printf '  "schema": "verify-proxy-ca/v1",\n')
  out+=$(printf '  "ok": %s,\n' "$ok")
  out+=$(printf '  "exit_code": %d,\n' "$code")
  if [ -n "$failed_id" ]; then
    out+=$(printf '  "failed_step": "%s",\n' "$(json_escape "$failed_id")")
  else
    out+=$(printf '  "failed_step": null,\n')
  fi
  out+=$(printf '  "config": { "deno_std_version": "%s", "jsr_url": "%s", "deno_std_url": "%s" },\n' \
    "$(json_escape "$DENO_STD_VERSION")" "$(json_escape "$JSR_URL")" "$(json_escape "$DENO_STD_URL")")
  out+=$(printf '  "checks": [\n')
  local i n=${#CHECK_IDS[@]}
  for ((i=0; i<n; i++)); do
    local sep=","; [ "$i" -eq $((n-1)) ] && sep=""
    local meta="${CHECK_META[$i]}"
    [ -n "$meta" ] && meta=", $meta"
    out+=$(printf '    { "id": "%s", "name": "%s", "ok": %s%s }%s\n' \
      "$(json_escape "${CHECK_IDS[$i]}")" \
      "$(json_escape "${CHECK_NAMES[$i]}")" \
      "${CHECK_OKS[$i]}" \
      "$meta" \
      "$sep")
  done
  out+=$(printf '  ]\n}\n')

  if [ -n "$JSON_FILE" ]; then
    printf '%s' "$out" > "$JSON_FILE"
    log "📄 JSON écrit dans $JSON_FILE"
  elif [ "$JSON_MODE" = "1" ]; then
    printf '%s' "$out"
  fi
  exit "$code"
}

fail() {
  # fail <exit_code> <failed_id> <human message>
  log "❌ $3"
  emit_json_and_exit "$1" "$2"
}

# ── 1/5 ─ Variables d'environnement ──────────────────────────────────────────
log "── 1/5 ─ Variables d'environnement"
log "  DENO_STD_VERSION=$DENO_STD_VERSION"
log "  JSR_URL=$JSR_URL"
log "  DENO_STD_URL=$DENO_STD_URL"
ENV_VARS_FOUND=$(env | grep -iE '^(https?_proxy|no_proxy|deno_cert)=' | cut -d= -f1 | tr '\n' ',' | sed 's/,$//')
if [ -z "$ENV_VARS_FOUND" ]; then
  record "env" "Variables d'environnement" "false" "\"vars\": []"
  # Place-holders pour les checks non exécutés (utile pour le support).
  record "dns"       "Résolution DNS"       "null" "\"skipped\": true"
  record "curl_jsr"  "curl JSR"             "null" "\"skipped\": true"
  record "curl_deno" "curl deno.land"       "null" "\"skipped\": true"
  record "deno_info" "deno info"            "null" "\"skipped\": true"
  fail 1 "env" "Aucune variable proxy exportée (HTTP_PROXY/HTTPS_PROXY/NO_PROXY/DENO_CERT)"
fi
# Liste des vars sous forme JSON array
VARS_JSON="["
IFS=',' read -ra _vs <<<"$ENV_VARS_FOUND"
for i in "${!_vs[@]}"; do
  [ "$i" -gt 0 ] && VARS_JSON+=", "
  VARS_JSON+="\"$(json_escape "${_vs[$i]}")\""
done
VARS_JSON+="]"
record "env" "Variables d'environnement" "true" "\"vars\": $VARS_JSON"
env | grep -iE '^(https?_proxy|no_proxy|deno_cert)=' \
  | sed -E 's#(://[^:]+:)[^@]+@#\1***@#' >&"$LOG_FD"

# ── 2/5 ─ Résolution DNS ─────────────────────────────────────────────────────
log "── 2/5 ─ Résolution DNS (court-circuite le proxy)"
DNS_HOSTS_JSON="["
DNS_OK=1
DNS_ERR=""
first=1
for host in "$JSR_HOST" "$DENO_STD_HOST"; do
  tool="none"; ok="true"; err=""
  if command -v dig >/dev/null 2>&1; then
    tool="dig"
    dig +short +time=3 +tries=1 "$host" | grep -Eq '^[0-9a-fA-F.:]+$' \
      || { ok="false"; err="dig: pas de réponse"; }
  elif command -v nslookup >/dev/null 2>&1; then
    tool="nslookup"
    nslookup "$host" >/dev/null 2>&1 || { ok="false"; err="nslookup: échec"; }
  elif command -v getent >/dev/null 2>&1; then
    tool="getent"
    getent hosts "$host" >/dev/null || { ok="false"; err="getent: échec"; }
  else
    ok="null"; err="aucun outil DNS dispo"
  fi
  [ "$first" -eq 0 ] && DNS_HOSTS_JSON+=", "
  first=0
  DNS_HOSTS_JSON+=$(printf '{ "host": "%s", "ok": %s, "tool": "%s", "error": "%s" }' \
    "$(json_escape "$host")" "$ok" "$tool" "$(json_escape "$err")")
  if [ "$ok" = "false" ]; then DNS_OK=0; DNS_ERR="DNS KO pour $host ($tool)"; else log "  ✓ $host résolu ($tool)"; fi
done
DNS_HOSTS_JSON+="]"
if [ "$DNS_OK" -eq 0 ]; then
  record "dns" "Résolution DNS" "false" "\"hosts\": $DNS_HOSTS_JSON"
  record "curl_jsr"  "curl JSR"       "null" "\"skipped\": true"
  record "curl_deno" "curl deno.land" "null" "\"skipped\": true"
  record "deno_info" "deno info"      "null" "\"skipped\": true"
  fail 2 "dns" "$DNS_ERR — vérifier /etc/resolv.conf ou le DNS interne"
fi
record "dns" "Résolution DNS" "true" "\"hosts\": $DNS_HOSTS_JSON"

# ── Helper curl avec capture HTTP code + temps ──────────────────────────────
do_curl() {
  # do_curl <id> <name> <url>  → record + retourne 0/1
  local id="$1" name="$2" url="$3"
  local out http_code time_total rc body_err
  # Format: "<http_code>|<time_total>"
  out=$(curl -sS -o /dev/null \
    -w '%{http_code}|%{time_total}' \
    ${DENO_CERT:+--cacert "$DENO_CERT"} \
    "$url" 2>/tmp/.verify-proxy-ca.curl-err) || rc=$?
  rc=${rc:-0}
  http_code="${out%%|*}"
  time_total="${out##*|}"
  [ -z "$http_code" ] && http_code="0"
  [ -z "$time_total" ] && time_total="0"
  body_err=$(json_escape "$(cat /tmp/.verify-proxy-ca.curl-err 2>/dev/null | head -c 300)")
  rm -f /tmp/.verify-proxy-ca.curl-err

  local ok="true"
  if [ "$rc" -ne 0 ] || [ "$http_code" = "000" ] || [ "$http_code" -ge 400 ] 2>/dev/null; then
    ok="false"
  fi
  local meta
  meta=$(printf '"url": "%s", "http_code": %s, "time_total_s": %s, "curl_exit": %d, "error": "%s"' \
    "$(json_escape "$url")" "$http_code" "$time_total" "$rc" "$body_err")
  record "$id" "$name" "$ok" "$meta"

  if [ "$ok" = "true" ]; then
    log "  ✓ $name → HTTP $http_code en ${time_total}s"
    return 0
  else
    log "  ✗ $name → HTTP $http_code (curl exit $rc)"
    return 1
  fi
}

# ── 3/5 ─ curl JSR ───────────────────────────────────────────────────────────
log "── 3/5 ─ curl HTTPS via proxy + CA (registry JSR)"
if ! do_curl "curl_jsr" "curl JSR" "$JSR_URL"; then
  record "curl_deno" "curl deno.land" "null" "\"skipped\": true"
  record "deno_info" "deno info"      "null" "\"skipped\": true"
  fail 3 "curl_jsr" "curl JSR a échoué — vérifier proxy/CA pour $JSR_HOST"
fi

# ── 4/5 ─ curl deno.land ─────────────────────────────────────────────────────
log "── 4/5 ─ curl HTTPS deno.land (chaîne TLS différente de jsr.io)"
if ! do_curl "curl_deno" "curl deno.land" "$DENO_STD_URL"; then
  record "deno_info" "deno info" "null" "\"skipped\": true"
  fail 3 "curl_deno" "curl deno.land a échoué — vérifier proxy/CA pour $DENO_STD_HOST"
fi

# ── 5/5 ─ deno info ──────────────────────────────────────────────────────────
if [ "$SKIP_DENO_INFO" = "1" ]; then
  log "── 5/5 ─ deno info SAUTÉ (SKIP_DENO_INFO=1)"
  record "deno_info" "deno info" "null" "\"skipped\": true, \"reason\": \"SKIP_DENO_INFO=1\""
elif ! command -v deno >/dev/null 2>&1; then
  log "── 5/5 ─ deno info SAUTÉ (binaire 'deno' introuvable)"
  record "deno_info" "deno info" "null" "\"skipped\": true, \"reason\": \"deno binary not found\""
else
  log "── 5/5 ─ deno info (résolution + téléchargement réel via le proxy)"
  if deno info "$DENO_STD_URL" >/dev/null 2>/tmp/.verify-proxy-ca.deno-err; then
    record "deno_info" "deno info" "true" "\"url\": \"$(json_escape "$DENO_STD_URL")\""
    log "  ✓ deno info OK"
  else
    rc=$?
    err=$(json_escape "$(cat /tmp/.verify-proxy-ca.deno-err 2>/dev/null | head -c 500)")
    rm -f /tmp/.verify-proxy-ca.deno-err
    record "deno_info" "deno info" "false" \
      "\"url\": \"$(json_escape "$DENO_STD_URL")\", \"deno_exit\": $rc, \"error\": \"$err\""
    fail 4 "deno_info" "deno info a échoué — Deno ne respecte pas le proxy/CA"
  fi
fi

log "✅ Proxy + CA corporate opérationnels — runner prêt pour les étapes build/test."
emit_json_and_exit 0 ""
