# Sovereign AI Workbench - Desktop Shortcut Creator
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ShortcutPath = Join-Path $DesktopPath "Sovereign AI Workbench.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = Join-Path $RepoRoot "Launch Workbench.bat"
$Shortcut.WorkingDirectory = $RepoRoot
$Shortcut.Description = "Launch Sovereign AI Workbench"
$Shortcut.Save()

Write-Host "Created Desktop shortcut: $ShortcutPath"
