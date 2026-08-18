# Puts a "Savings" shortcut on the Desktop.
$exe = Join-Path $PSScriptRoot 'dist\Savings.exe'
if (-not (Test-Path $exe)) { Write-Error "Missing $exe - publish the project first."; exit 1 }

$link = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Savings.lnk'
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath = $exe
$sc.WorkingDirectory = Split-Path $exe
$sc.Description = 'VND and USD savings ladder'
$sc.Save()

Write-Host "Created: $link"
