function Get-ProjectTree {
    param(
        [string]$Path = ".",
        [int]$Depth = 3
    )
    
    $excluded = @('node_modules', '.git', 'dist', 'build')
    
    function Get-Tree($folder, $currentDepth) {
        $prefix = "|   " * $currentDepth
        Write-Output "$prefix|"
        Write-Output "$prefix+-- $($folder.Name)/"
        
        if ($currentDepth -lt $Depth) {
            Get-ChildItem $folder -Directory | Where-Object {
                $excluded -notcontains $_.Name
            } | ForEach-Object {
                Get-Tree $_ ($currentDepth + 1)
            }
            
            Get-ChildItem $folder -File | Where-Object {
                $excluded -notcontains $_.Name
            } | ForEach-Object {
                $filePrefix = "|   " * ($currentDepth + 1)
                Write-Output "$filePrefix|   $($_.Name)"
            }
        }
    }
    
    Get-Tree (Get-Item $Path) 0
}

# Run and save to file
Get-ProjectTree | Out-File -FilePath project-structure.txt
Write-Host "Project structure saved to project-structure.txt"