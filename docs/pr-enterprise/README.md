# Enterprise platform PR — issue bodies

Bodies for **`gh issue create --body-file`**. Paths are relative to the **repository root**.

From repo root: **`pnpm run pr:enterprise -- labels`**, **`pnpm run pr:enterprise -- issues`**, dry **`pnpm run pr:enterprise -- issues --dry`** (any extra flags go after `--`). Shortcuts: `pnpm run pr:enterprise:labels`, `pnpm run pr:enterprise:issues`, `pnpm run pr:enterprise:issues:dry`. The runner uses **Node** to pick PowerShell on Windows vs `bash` on macOS/Linux (avoids a broken **WSL** `bash`). Prefer `…:sh` / `…issues:dry:sh` for explicit `.sh`; `…ps1` / `…dry:ps1` for bare PowerShell.

1. Optionally create labels: **`pnpm run pr:enterprise -- labels`** (or `pnpm run pr:enterprise:labels`, or `bash docs/gh-labels-enterprise-pr.sh` / `powershell … gh-labels-enterprise-pr.ps1`).
2. Run: **`pnpm run pr:enterprise -- issues`** (**`pnpm run pr:enterprise -- issues --dry`** first to verify paths). Target another repo: **`pnpm run pr:enterprise -- issues --dry --repo owner/name`** (or `cross-env GH_REPO=owner/name pnpm run pr:enterprise:issues`). Otherwise use `gh repo set-default owner/name`.
3. Copy the printed **`Fixes #…`** line into [pr-body-only.md](../pr-body-only.md).
4. Refresh issue bodies on GitHub: **`pnpm run pr:enterprise:issues:sync`** (reads `docs/pr-enterprise/issues/*.md`).
5. Optional screenshots: **`pnpm run pr:enterprise:screenshots:capture`** → **`pnpm run pr:enterprise:screenshots:copy`** → commit `docs/pr-enterprise/assets/issues/issue-evidence/`.
6. **Enterprise issue bodies** (diagrams, code, Cypress PNGs): edit `docs/pr-enterprise/issues/*.md`, then **`pnpm run pr:enterprise:screenshots:capture`** → **`pnpm run pr:enterprise:screenshots:copy`** → commit assets → **`pnpm run pr:enterprise:issues:sync`**.

Parent pack: [enterprise-pr-pack-feat-platform-rebaseline.md](../enterprise-pr-pack-feat-platform-rebaseline.md).
