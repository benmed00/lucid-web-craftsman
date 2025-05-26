$exclude = @('node_modules','.git','dist','build')
$maxDepth = 3

function Get-Structure {
    param(
        [string]$path = ".",
        [int]$depth = 0
    )
    
    $item = Get-Item $path
    $indent = '    ' * $depth
    
    if ($item.PSIsContainer) {
        "$indent+ [$($item.Name)]"
        if ($depth -lt $maxDepth) {
            Get-ChildItem $path | Where-Object { 
                $exclude -notcontains $_.Name -and 
                $_.FullName -notmatch '\\node_modules\\|\\\.git\\|\\dist\\|\\build\\'
            } | ForEach-Object {
                Get-Structure $_.FullName ($depth + 1)
            }
        }
    } else {
        "$indent- $($item.Name)"
    }
}

Get-Structure | Out-File -FilePath project-structure.txt
Write-Host "Project structure saved to project-structure.txt"