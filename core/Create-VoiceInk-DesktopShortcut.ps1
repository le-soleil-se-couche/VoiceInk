param(
  [switch]$AllUsers
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "VoiceInk-Launch.vbs"
$iconPath = Join-Path (Split-Path -Parent $scriptDir) "src/assets/icon.ico"

if (-not (Test-Path $vbsPath)) {
  throw "Missing launcher: $vbsPath"
}

$desktop = if ($AllUsers) {
  [Environment]::GetFolderPath("CommonDesktopDirectory")
} else {
  [Environment]::GetFolderPath("Desktop")
}

$shortcutPath = Join-Path $desktop "VoiceInk.lnk"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = """$vbsPath"""
$shortcut.WorkingDirectory = Split-Path -Parent $vbsPath

if (Test-Path $iconPath) {
  $shortcut.IconLocation = $iconPath
}

$shortcut.Save()
Write-Host "Created shortcut: $shortcutPath"
