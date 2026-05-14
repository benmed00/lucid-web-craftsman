#!/usr/bin/env bash
# deno-mode-toggle.sh
# -----------------------------------------------------------------------------
# Bascule automatique CONNECTÉ ⇄ OFFLINE pour la suite Deno (pricing-snapshot
# helpers + tests Edge), avec vérification que le cache local (DENO_DIR) est
# complet à partir des logs.
#
# Workflow type :
#   1. Mode "online"  : hydrate DENO_DIR avec accès réseau (proxy/CA OK).
#   2. Mode "offline" : rejoue la même suite SANS réseau (env -i, --cached-only,
#                       DENO_OFFLINE=1) et échoue si une trace réseau apparaît.
#   3. Mode "auto"    : enchaîne online → offline et compare les deux logs
#                       pour confirmer que tout ce qui a été fetché en "online"
#                       est bien servi par le cache en "offline".
#
# Usage :
#   ./scripts/deno-mode-toggle.sh online        # hydrate le cache
#   ./scripts/deno-mode-toggle.sh offline       # vérifie air-gapped
#   ./scripts/deno-mode-toggle.sh auto          # défaut : online puis offline
#   ./scripts/deno-mode-toggle.sh verify-cache  # n'exécute rien, audite le cache
#
# Variables :
#   DENO_DIR           (def: .deno-cache)        Cache Deno local
#   DENO_CONFIG        (def: supabase/functions/deno.json)
#   TEST_FILES         (def: liste pricing-snapshot — voir DEFAULT_TESTS)
#   LOG_DIR            (def: .deno-cache/.logs)  Logs horodatés
#
# Codes de sortie :
#   0  OK
#   1  arguments invalides
#   2  mode online a échoué (réseau / TLS / proxy)
#   3  mode offline a échoué (cache incomplet ou tentative réseau)
#   4  audit cache : delta détecté entre online et offline
# -----------------------------------------------------------------------------
set -uo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${DENO_DIR:=$ROOT_DIR/.deno-cache}"
: "${DENO_CONFIG:=supabase/functions/deno.json}"
: "${LOG_DIR:=$DENO_DIR/.logs}"

DEFAULT_TESTS=(
  supabase/functions/_shared/pricing-snapshot_test.ts
  supabase/functions/_shared/pricing_snapshot_golden_test.ts
  supabase/functions/_shared/pricing_snapshot_extended_test.ts
  supabase/functions/_shared/persist-pricing-snapshot_test.ts
  supabase/functions/stripe-webhook/lib/pricing-snapshot_test.ts
  supabase/functions/send-order-confirmation/_lib/email-pricing-from-db_test.ts
)
if [[ -n "${TEST_FILES:-}" ]]; then
  # Permet de surcharger via env var (séparée par espaces).
  read -r -a TEST_FILES_ARR <<<"$TEST_FILES"
else
  TEST_FILES_ARR=("${DEFAULT_TESTS[@]}")
fi

mkdir -p "$DENO_DIR" "$LOG_DIR"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_ONLINE="$LOG_DIR/online-$TS.log"
LOG_OFFLINE="$LOG_DIR/offline-$TS.log"

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { printf '\033[1;36m[deno-toggle]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deno-toggle]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[deno-toggle]\033[0m %s\n' "$1" >&2; exit "${2:-1}"; }

require_deno() {
  command -v deno >/dev/null 2>&1 || die "deno introuvable dans le PATH" 1
  local v
  v="$(deno --version | head -1)"
  log "Deno : $v"
  log "DENO_DIR : $DENO_DIR ($(du -sh "$DENO_DIR" 2>/dev/null | cut -f1 || echo '0'))"
}

# Patterns réseau interdits en mode offline.
NET_PATTERNS='Download https?://|error sending request|error trying to connect|Network is unreachable|tcp connect error|dns error|UnknownIssuer|invalid peer certificate|Connection refused|Temporary failure in name resolution'

# ── Mode ONLINE : hydrate le cache ───────────────────────────────────────────
run_online() {
  require_deno
  log "── Mode ONLINE — hydrate $DENO_DIR via deno cache + deno test"
  log "Logs → $LOG_ONLINE"

  # 1. Pré-cache explicite (résout tous les imports, télécharge JSR + npm).
  if ! DENO_DIR="$DENO_DIR" deno cache --config "$DENO_CONFIG" \
       "${TEST_FILES_ARR[@]}" 2>&1 | tee -a "$LOG_ONLINE"; then
    die "deno cache a échoué — vérifier proxy/CA (voir docs/DENO_CERT.md)" 2
  fi

  # 2. Run réel pour valider l'exécution + capturer d'éventuels imports lazy.
  if ! DENO_DIR="$DENO_DIR" deno test \
       --allow-env --allow-read="$ROOT_DIR" --no-check \
       --config "$DENO_CONFIG" \
       "${TEST_FILES_ARR[@]}" 2>&1 | tee -a "$LOG_ONLINE"; then
    die "deno test (online) a échoué" 2
  fi

  log "✓ ONLINE OK — cache hydraté ($(du -sh "$DENO_DIR" | cut -f1))"
}

# ── Mode OFFLINE : vérifie air-gapped ────────────────────────────────────────
run_offline() {
  require_deno
  log "── Mode OFFLINE — env -i + DENO_OFFLINE=1 + --cached-only"
  log "Logs → $LOG_OFFLINE"

  if [[ -z "$(ls -A "$DENO_DIR" 2>/dev/null)" ]]; then
    die "DENO_DIR vide — lance d'abord '$0 online'" 3
  fi

  set +e
  env -i \
    PATH="$PATH" HOME="$HOME" \
    DENO_DIR="$DENO_DIR" DENO_OFFLINE=1 \
    deno test --cached-only --allow-env --allow-read="$ROOT_DIR" --no-check \
      --config "$DENO_CONFIG" \
      "${TEST_FILES_ARR[@]}" 2>&1 | tee "$LOG_OFFLINE"
  local rc=${PIPESTATUS[0]}
  set -e

  if [[ $rc -ne 0 ]]; then
    warn "deno test (offline) a échoué (exit $rc) — cache probablement incomplet"
    grep -E 'Module not found|Specifier not found|requires --allow-net|cached-only' "$LOG_OFFLINE" | head -20 >&2 || true
    exit 3
  fi

  # Scan post-mortem : aucune trace réseau ne doit apparaître.
  if grep -E "$NET_PATTERNS" "$LOG_OFFLINE" >/dev/null; then
    warn "Trace réseau détectée dans le log offline :"
    grep -nE "$NET_PATTERNS" "$LOG_OFFLINE" | head -20 >&2
    exit 3
  fi

  log "✓ OFFLINE OK — aucune tentative réseau, cache suffisant"
}

# ── Audit cache : compare online vs offline ──────────────────────────────────
verify_cache_from_logs() {
  log "── Audit cache (corrélation des logs)"

  local last_online last_offline
  last_online="$(ls -1t "$LOG_DIR"/online-*.log 2>/dev/null | head -1 || true)"
  last_offline="$(ls -1t "$LOG_DIR"/offline-*.log 2>/dev/null | head -1 || true)"

  [[ -z "$last_online"  ]] && die "Aucun log 'online'  — lance '$0 online'  d'abord" 4
  [[ -z "$last_offline" ]] && die "Aucun log 'offline' — lance '$0 offline' d'abord" 4

  log "  online  : $last_online"
  log "  offline : $last_offline"

  # URLs téléchargées en mode online (lignes "Download <url>").
  local online_urls
  online_urls="$(grep -Eo 'Download https?://[^[:space:]]+' "$last_online" \
                  | sort -u || true)"
  local n_online
  n_online="$(printf '%s\n' "$online_urls" | grep -c . || true)"
  log "  URLs téléchargées en online : $n_online"

  # En offline, AUCUNE URL ne doit avoir été téléchargée.
  local offline_dl
  offline_dl="$(grep -Eo 'Download https?://[^[:space:]]+' "$last_offline" \
                 | sort -u || true)"
  if [[ -n "$offline_dl" ]]; then
    warn "❌ Le mode offline a tenté de télécharger :"
    printf '  - %s\n' $offline_dl >&2
    exit 4
  fi

  # Vérifie que chaque URL hôte vue en online a un répertoire dans le cache.
  local missing=0
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    local host
    host="$(printf '%s' "${url#Download }" | awk -F/ '{print $3}')"
    [[ -z "$host" ]] && continue
    if ! find "$DENO_DIR" -type d -path "*${host}*" -print -quit | grep -q .; then
      warn "Cache manquant pour host : $host"
      missing=$((missing + 1))
    fi
  done <<<"$online_urls"

  if [[ $missing -gt 0 ]]; then
    warn "❌ $missing host(s) absent(s) du cache — cache incomplet"
    exit 4
  fi

  log "✓ Cache complet : tout ce qui a été fetché en online est servi en offline"
}

# ── Dispatch ─────────────────────────────────────────────────────────────────
MODE="${1:-auto}"
case "$MODE" in
  online)        run_online ;;
  offline)       run_offline ;;
  verify-cache)  verify_cache_from_logs ;;
  auto)
    run_online
    run_offline
    verify_cache_from_logs
    log "✅ Bascule online → offline réussie, cache validé"
    ;;
  -h|--help|help)
    sed -n '2,40p' "$0"; exit 0 ;;
  *)
    die "Mode inconnu : '$MODE' (online|offline|auto|verify-cache)" 1 ;;
esac
