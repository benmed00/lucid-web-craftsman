#Requires -Version 5.1

<#
.SYNOPSIS
Creates the eight enterprise tracking issues via gh CLI.
Requires: PowerShell 5.1+ or 7+; GitHub CLI (`gh`) on PATH.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File docs/gh-issues-enterprise-platform.ps1
  powershell -ExecutionPolicy Bypass -File docs/gh-issues-enterprise-platform.ps1 -Repo "owner/repo" -DryRun
#>
param (
  [string] $Repo = "",
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-CreateIssue {
  param (
    [string] $Title,
    [string] $BodyPath,
    [string[]] $Labels
  )

  $full = Join-Path $RepoRoot $BodyPath
  if (-not (Test-Path $full)) {
    throw "Missing body file: $full"
  }

  if ($DryRun) {
    Write-Host "[dry-run] $Title"
    return $null
  }

  $cmd = @("issue", "create", "--title", $Title, "--body-file", $full)
  if ($Repo) { $cmd += @("-R", $Repo) }
  foreach ($lbl in $Labels) {
    $cmd += "--label"
    $cmd += $lbl
  }

  $url = (gh @cmd).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "gh issue create failed: $Title"
  }

  if ($url -match "/issues/(\d+)") {
    return [int]$Matches[1]
  }
  Write-Warning "Could not parse issue number from: $url"
  return $null
}

$definitions = @(
  @{
    Title  = "ci: workflows, smoke probe parity, and GITHUB-ACTIONS runbook"
    Body   = "docs/pr-enterprise/issues/01-ci-runbook.md"
    Labels = @("area:ci", "type:documentation", "area:docs")
  },
  @{
    Title  = "chore(lint): align eslint config with stricter posture on admin/UI surfaces"
    Body   = "docs/pr-enterprise/issues/02-eslint-any.md"
    Labels = @("area:frontend", "tech-debt")
  },
  @{
    Title  = "docs: rules registry, business logic, tech map, and agent runbooks"
    Body   = "docs/pr-enterprise/issues/03-platform-docs.md"
    Labels = @("area:docs", "type:documentation")
  },
  @{
    Title  = "test(e2e): smoke probe port alignment and internal links spec"
    Body   = "docs/pr-enterprise/issues/04-e2e-smoke.md"
    Labels = @("area:test", "area:ci")
  },
  @{
    Title  = "supabase: create-payment schema, confirm-order tests, generate-invoice hardening"
    Body   = "docs/pr-enterprise/issues/05-supabase-edge.md"
    Labels = @("area:supabase", "risk: medium")
  },
  @{
    Title  = "types: edge invoke contracts, domain modules, Typedoc pipeline"
    Body   = "docs/pr-enterprise/issues/06-types-contracts.md"
    Labels = @("area:frontend", "type:feature")
  },
  @{
    Title  = "chore(scripts): audit metrics, doc link check, gen-docs, proxy/CA helpers"
    Body   = "docs/pr-enterprise/issues/07-scripts-tooling.md"
    Labels = @("area:ci", "type:chore")
  },
  @{
    Title  = "perf/seo: OptimizedImage, Hero webp set, sitemap, llms.txt, index metadata"
    Body   = "docs/pr-enterprise/issues/08-perf-seo.md"
    Labels = @("area:frontend", "type:feature")
  }
)

$numbers = [System.Collections.ArrayList]::new()
foreach ($def in $definitions) {
  $n = Invoke-CreateIssue -Title $def.Title -BodyPath $def.Body -Labels $def.Labels
  if ($null -ne $n) {
    [void]$numbers.Add($n)
  }
}

if ($numbers.Count -gt 0 -and -not $DryRun) {
  $fixes = ($numbers | ForEach-Object { "#$_" }) -join ", "
  Write-Host ""
  Write-Host "Paste into docs/pr-body-only.md (Related issues):"
  Write-Host "Fixes $fixes"
}
