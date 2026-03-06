param(
  [string]$ExpectedRepoPath = "C:\Users\shikq\备份文档（Ewin）\brainstorm\_ARCHIVE\openwhispr",
  [int]$TailLines = 120
)

$ErrorActionPreference = "Stop"

Write-Host "=== OpenWhispr Runtime Verification ==="
Write-Host "Expected repo: $ExpectedRepoPath"

$procs = Get-CimInstance Win32_Process |
  Where-Object {
    $name = "$($_.Name)".ToLowerInvariant()
    $cmd = "$($_.CommandLine)".ToLowerInvariant()

    if ($name -eq "openwhispr.exe" -or $name -eq "openwhispr") {
      return $true
    }
    if ($name -eq "electron.exe" -or $name -eq "electron") {
      return $true
    }
    if (($name -eq "node.exe" -or $name -eq "node" -or $name -eq "esbuild.exe" -or $name -eq "esbuild") -and $cmd -match "openwhispr") {
      return $true
    }

    return $false
  } |
  Select-Object ProcessId, Name, ExecutablePath, CommandLine

if (-not $procs) {
  Write-Host "[WARN] No running OpenWhispr/Electron process found."
} else {
  Write-Host "`n-- Running processes --"
  $procs | Format-Table -AutoSize | Out-String | Write-Host
}

$tail = @()
$logDir = $null
$latestLog = $null

$fingerprintFileCandidates = @(
  (Join-Path $env:APPDATA "OpenWhispr-development\runtime-fingerprint.json"),
  (Join-Path $env:APPDATA "OpenWhispr\runtime-fingerprint.json")
)

$fingerprintFile = $fingerprintFileCandidates |
  Where-Object { Test-Path $_ } |
  Sort-Object { (Get-Item $_).LastWriteTime } -Descending |
  Select-Object -First 1

$fingerprintJson = $null
if ($fingerprintFile) {
  Write-Host "`nFingerprint file: $fingerprintFile"
  try {
    $fingerprintJson = Get-Content -Path $fingerprintFile -Raw | ConvertFrom-Json
    $fingerprintJson | ConvertTo-Json -Depth 6 | Write-Host
  } catch {
    Write-Host "[WARN] Failed to parse fingerprint file: $($_.Exception.Message)"
  }
} else {
  Write-Host "`n[WARN] No runtime-fingerprint.json found under APPDATA."
}

$fingerprintPidActive = $false
if ($fingerprintJson -and $fingerprintJson.pid) {
  $fingerprintPidActive = $procs | Where-Object { $_.ProcessId -eq [int]$fingerprintJson.pid } | Select-Object -First 1
  if (-not $fingerprintPidActive) {
    Write-Host "[WARN] Fingerprint PID $($fingerprintJson.pid) is not currently running (stale runtime evidence)."
  }
}

$devLogDir = Join-Path $env:APPDATA "OpenWhispr-development\logs"
$prodLogDir = Join-Path $env:APPDATA "OpenWhispr\logs"
if (Test-Path $devLogDir) {
  $logDir = $devLogDir
} elseif (Test-Path $prodLogDir) {
  $logDir = $prodLogDir
}

if ($logDir) {
  $latestLog = Get-ChildItem -Path $logDir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

if ($latestLog) {
  Write-Host "`nLog dir: $logDir"
  Write-Host "Latest log: $($latestLog.FullName)"
  $tail = Get-Content -Path $latestLog.FullName -Tail $TailLines
} elseif ($logDir) {
  Write-Host "`n[WARN] No log files found in $logDir"
} else {
  Write-Host "`n[WARN] No log directory found in $devLogDir or $prodLogDir"
}

$fingerprintIndex = -1
$pasteProtocolIndexes = @()
for ($i = 0; $i -lt $tail.Count; $i++) {
  if ($tail[$i] -match '\[RUNTIME_FINGERPRINT\]') {
    $fingerprintIndex = $i
  }
  if ($tail[$i] -match '\[PASTE_PROTOCOL\]') {
    $pasteProtocolIndexes += $i
  }
}

Write-Host "`n-- Runtime fingerprint from logs (latest) --"
if ($fingerprintIndex -ge 0) {
  $fingerprintEnd = [Math]::Min($fingerprintIndex + 12, $tail.Count - 1)
  for ($i = $fingerprintIndex; $i -le $fingerprintEnd; $i++) {
    Write-Host $tail[$i]
  }
} else {
  Write-Host "[WARN] No [RUNTIME_FINGERPRINT] entry found in the last $TailLines lines."
}

Write-Host "`n-- Paste protocol from logs (latest 5) --"
if ($pasteProtocolIndexes.Count -gt 0) {
  $lastIndexes = $pasteProtocolIndexes | Select-Object -Last 5
  foreach ($idx in $lastIndexes) {
    $entryEnd = [Math]::Min($idx + 12, $tail.Count - 1)
    for ($i = $idx; $i -le $entryEnd; $i++) {
      Write-Host $tail[$i]
    }
    Write-Host ""
  }
} else {
  Write-Host "[WARN] No [PASTE_PROTOCOL] entry found in the last $TailLines lines."
}

$repoHitFromLogs = $tail | Where-Object { $_ -match [regex]::Escape($ExpectedRepoPath) } | Select-Object -First 1
$repoHitFromProcs = $procs | Where-Object { ($_.CommandLine -as [string]) -match [regex]::Escape($ExpectedRepoPath) } | Select-Object -First 1
$repoHitFromFingerprint = $null
if ($fingerprintJson -and $fingerprintJson.appPath) {
  if (($fingerprintJson.appPath -as [string]) -match [regex]::Escape($ExpectedRepoPath)) {
    $repoHitFromFingerprint = $fingerprintJson.appPath
  }
}

if ($repoHitFromProcs -or ($repoHitFromFingerprint -and $fingerprintPidActive)) {
  Write-Host "`n[PASS] Active runtime verified with expected repo path."
  exit 0
}

Write-Host "`n[WARN] Active runtime not verified. Launch app from expected repo, then rerun this check."
exit 1
