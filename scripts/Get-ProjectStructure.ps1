function Get-ProjectStructure {
    param(
        [string]$Path = ".",
        [int]$Depth = 3
    )
    
    $exclude = @('node_modules', '.git', 'dist')
    
    Get-ChildItem -Path $Path -Recurse -Depth $Depth | 
    Where-Object { 
        $exclude -notcontains $_.Name -and 
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\\.git\\' -and
        $_.FullName -notmatch '\\dist\\'
    } |
    ForEach-Object {
        $indent = '    ' * ($_.FullName.Split('\').Count - $Path.Split('\').Count)
        if ($_.PSIsContainer) {
            "$indent+ [$($_.Name)]"
        } else {
            "$indent- $($_.Name)"
        }
    }
}

Get-ProjectStructure | Out-File -FilePath project-structure.txt
Write-Host "Project structure saved to project-structure.txt"