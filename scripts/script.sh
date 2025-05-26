function Show-ProjectTree {
    $root = Get-Item .
    $indent = "|   "
    
    function Get-Tree($folder, $depth) {
        $prefix = $indent * $depth
        Write-Host "$prefix|"
        Write-Host "$prefix+-- $($folder.Name)/"
        
        Get-ChildItem $folder -Exclude node_modules | ForEach-Object {
            if ($_.PSIsContainer) {
                if ($_.Name -ne 'node_modules') {
                    Get-Tree $_ ($depth + 1)
                }
            } else {
                $filePrefix = $indent * ($depth + 1)
                Write-Host "$filePrefix|   $($_.Name)"
            }
        }
    }
    
    Get-Tree $root 0
}

Show-ProjectTree