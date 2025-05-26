function Get-ProjectTree {
    param(
        [string]$Path = ".",
        [string]$Exclude = "node_modules",
        [int]$Depth = 3
    )
    
    Get-ChildItem -Path $Path -Recurse -Depth $Depth -Exclude $Exclude |
    Where-Object { $_.FullName -notmatch "\\$Exclude\\?" } |
    ForEach-Object {
        $indent = "|   " * ($_.FullName.Split('\').Count - $Path.Split('\').Count)
        if ($_.PSIsContainer) {
            "|$indent+-- $($_.Name)/"
        } else {
            "|$indent|-- $($_.Name)"
        }
    }
}

Get-ProjectTree | Out-File -FilePath project-structure.txt