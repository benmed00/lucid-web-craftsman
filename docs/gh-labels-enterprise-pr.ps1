#Requires -Version 5.1

<#
.SYNOPSIS
Creates GitHub labels for the enterprise platform PR (safe if labels already exist).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File docs/gh-labels-enterprise-pr.ps1
  powershell -ExecutionPolicy Bypass -File docs/gh-labels-enterprise-pr.ps1 -Repo "benmed00/lucid-web-craftsman"
#>
param (
  [string] $Repo = ""
)

function New-IssueLabel {
  param (
    [string] $Name,
    [string] $Color,
    [string] $Description
  )

  if ($Repo) {
    gh label create $Name --color $Color --description $Description -R $Repo 2>$null
  } else {
    gh label create $Name --color $Color --description $Description 2>$null
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  (exists or skip): $Name"
  } else {
    Write-Host "  created: $Name"
  }
}

Write-Host "Creating labels..."
New-IssueLabel "type:feature" "0E8A16" "Broad feature or capability"
New-IssueLabel "type:documentation" "0075CA" "Docs and runbooks"
New-IssueLabel "type:chore" "C5DEF5" "Tooling / maintenance"
New-IssueLabel "area:ci" "0366D6" "CI workflows, parity"
New-IssueLabel "area:docs" "5319E7" "Documentation"
New-IssueLabel "area:supabase" "D8770B" "Edge functions, Deno"
New-IssueLabel "area:frontend" "7057FF" "React SPA"
New-IssueLabel "area:test" "FBCA04" "Tests"
New-IssueLabel "size: XL" "B60205" "Very large PR"
New-IssueLabel "needs: review" "FEF2C0" "Awaiting review"
New-IssueLabel "risk: medium" "8B4513" "Payments / checkout touch"
New-IssueLabel "dependencies" "EDEDED" "Lockfile"
New-IssueLabel "security" "1D76DB" "Security surface"
New-IssueLabel "tech-debt" "F9D0C4" "Tech debt cleanup"
if ($Repo) {
  Write-Host "Done. Run: gh label list -R $Repo"
} else {
  Write-Host "Done. Run: gh label list"
}
