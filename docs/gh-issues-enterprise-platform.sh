#!/usr/bin/env bash
# Creates the eight enterprise tracking issues (parity with gh-issues-enterprise-platform.ps1).
# Usage: gh repo set-default owner/repo
#    or: GH_REPO=owner/repo bash docs/gh-issues-enterprise-platform.sh
# Dry run: DRY_RUN=1 bash docs/gh-issues-enterprise-platform.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REPO_ARGS=()
if [[ -n "${GH_REPO:-}" ]]; then
  REPO_ARGS=(-R "$GH_REPO")
fi

declare -a nums=()

mk() {
  local title="$1"
  local body_rel="$2"
  shift 2
  local full="$ROOT/$body_rel"
  if [[ ! -f "$full" ]]; then
    echo "missing: $full" >&2
    exit 1
  fi

  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "[dry-run] $title"
    return
  fi

  local ghargs=(issue create --title "$title" --body-file "$full" "${REPO_ARGS[@]}")
  local label
  for label in "$@"; do
    ghargs+=(--label "$label")
  done

  local url
  url="$(gh "${ghargs[@]}")"
  local num
  num="$(basename "${url//$'\r'/}")"
  if [[ "$num" =~ ^[0-9]+$ ]]; then
    nums+=("$num")
  else
    echo "warn: could not parse issue number from: $url" >&2
  fi
}

mk "ci: workflows, smoke probe parity, and GITHUB-ACTIONS runbook" \
  "docs/pr-enterprise/issues/01-ci-runbook.md" \
  area:ci type:documentation area:docs

mk "chore(lint): align eslint config with stricter posture on admin/UI surfaces" \
  "docs/pr-enterprise/issues/02-eslint-any.md" \
  area:frontend tech-debt

mk "docs: rules registry, business logic, tech map, and agent runbooks" \
  "docs/pr-enterprise/issues/03-platform-docs.md" \
  area:docs type:documentation

mk "test(e2e): smoke probe port alignment and internal links spec" \
  "docs/pr-enterprise/issues/04-e2e-smoke.md" \
  area:test area:ci

mk "supabase: create-payment schema, confirm-order tests, generate-invoice hardening" \
  "docs/pr-enterprise/issues/05-supabase-edge.md" \
  area:supabase "risk: medium"

mk "types: edge invoke contracts, domain modules, Typedoc pipeline" \
  "docs/pr-enterprise/issues/06-types-contracts.md" \
  area:frontend type:feature

mk "chore(scripts): audit metrics, doc link check, gen-docs, proxy/CA helpers" \
  "docs/pr-enterprise/issues/07-scripts-tooling.md" \
  area:ci type:chore

mk "perf/seo: OptimizedImage, Hero webp set, sitemap, llms.txt, index metadata" \
  "docs/pr-enterprise/issues/08-perf-seo.md" \
  area:frontend type:feature

if [[ "${DRY_RUN:-0}" != "1" && ${#nums[@]} -gt 0 ]]; then
  fixes="Fixes "
  sep=""
  for n in "${nums[@]}"; do
    fixes="${fixes}${sep}#${n}"
    sep=", "
  done
  echo ""
  echo "Paste into docs/pr-body-only.md (Related issues):"
  echo "$fixes"
fi
