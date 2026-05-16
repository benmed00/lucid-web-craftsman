#!/usr/bin/env bash
# Create suggested GitHub labels for the enterprise platform PR (idempotent-ish: errors if label exists).
# Usage: GH_REPO=owner/repo bash docs/gh-labels-enterprise-pr.sh
# Or:    gh repo set-default owner/repo && bash docs/gh-labels-enterprise-pr.sh

set -euo pipefail

REPO_ARGS=()
[[ -n "${GH_REPO:-}" ]] && REPO_ARGS=(-R "$GH_REPO")

create() {
  local name="$1" color="$2" desc="$3"
  gh label create "$name" --color "$color" --description "$desc" "${REPO_ARGS[@]}" 2>/dev/null || true
}

create "type:feature" "0E8A16" "Broad feature or capability"
create "type:documentation" "0075CA" "Docs and runbooks"
create "type:chore" "C5DEF5" "Tooling / maintenance"
create "area:ci" "0366d6" "CI workflows, parity, Actions"
create "area:docs" "6F42C1" "Documentation runbooks"
create "area:supabase" "D8770B" "Edge functions, Postgres, Deno"
create "area:frontend" "5319E7" "React SPA, hooks, UX"
create "area:test" "FBCA04" "Vitest, Cypress, smoke"
create "size: XL" "B60205" "Very large PR — staged review"
create "needs: review" "FEF2C0" "Awaiting reviewer"
create "risk: medium" "8B4513" "Touches checkout / payments paths"
create "dependencies" "EDEDED" "Lockfile / package changes"
create "security" "1D76DB" "Auth, RLS, secrets surface"
create "tech-debt" "F9D0C4" "Tech debt cleanup"

if [[ -n "${GH_REPO:-}" ]]; then
  echo "Done. Existing labels show harmless errors above. Verify with: gh label list -R \"${GH_REPO}\""
else
  echo "Done. Existing labels show harmless errors above. Verify with: gh label list"
fi
