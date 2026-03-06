param(
  [int]$TailLines = 80,
  [switch]$IncludeFingerprint
)

$ErrorActionPreference = "Stop"

function Get-LogDir {
  $devLogDir = Join-Path $env:APPDATA "OpenWhispr-development\logs"
  $prodLogDir = Join-Path $env:APPDATA "OpenWhispr\logs"

  if (Test-Path $devLogDir) { return $devLogDir }
  if (Test-Path $prodLogDir) { return $prodLogDir }
  return $null
}

$logDir = Get-LogDir
if (-not $logDir) {
  Write-Host "[FAIL] No log directory found under APPDATA."
  exit 2
}

Write-Host "=== OpenWhispr Paste Protocol Watcher ==="
Write-Host "Log dir: $logDir"
Write-Host "TailLines: $TailLines"
Write-Host "IncludeFingerprint: $IncludeFingerprint"
Write-Host "Press Ctrl+C to stop."

$pattern = if ($IncludeFingerprint) {
  "PASTE_PROTOCOL|Paste timing|RUNTIME_FINGERPRINT"
} else {
  "PASTE_PROTOCOL|Paste timing"
}

$latestLog = Get-ChildItem -Path $logDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestLog) {
  Write-Host "[FAIL] No log file found in $logDir"
  exit 3
}

Write-Host "Watching: $($latestLog.FullName)"
$remainingContextLines = 0
$defaultContextLines = 14

Get-Content -Path $latestLog.FullName -Tail $TailLines -Wait | ForEach-Object {
  $line = $_

  if ($line -match $pattern) {
    Write-Host $line
    $remainingContextLines = $defaultContextLines
    return
  }

  if ($remainingContextLines -gt 0) {
    Write-Host $line
    $remainingContextLines--
    if ($remainingContextLines -eq 0) {
      Write-Host ""
    }
  }
}
