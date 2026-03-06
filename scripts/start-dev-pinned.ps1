param(
  [object]$KillExisting = $true,
  [string]$Marker = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Convert-ToBool {
  param(
    [Parameter(Mandatory = $false)][object]$Value,
    [Parameter(Mandatory = $false)][bool]$Default = $true
  )

  if ($null -eq $Value) { return $Default }
  if ($Value -is [bool]) { return $Value }
  if ($Value -is [int] -or $Value -is [long]) { return [bool]$Value }

  $normalized = "$Value".Trim().ToLowerInvariant()
  if ($normalized -in @("1", "true", "t", "yes", "y", "on")) { return $true }
  if ($normalized -in @("0", "false", "f", "no", "n", "off")) { return $false }

  throw "Invalid KillExisting value: '$Value'. Use true/false/1/0."
}

if (-not $Marker) {
  $Marker = "dev-" + (Get-Date -Format "yyyyMMdd-HHmmss")
}

Write-Host "=== VoiceInk Pinned Dev Start ==="
Write-Host "Repo: $repoRoot"
Write-Host "Marker: $Marker"

$shouldKill = Convert-ToBool -Value $KillExisting -Default $true

if ($shouldKill) {
  Write-Host "Stopping existing electron/VoiceInk processes..."
  $currentPid = $PID
  $targets = Get-CimInstance Win32_Process |
    Where-Object {
      if ($_.ProcessId -eq $currentPid) { return $false }

      $name = ($_.Name | ForEach-Object { "$_".ToLowerInvariant() })
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
    }

  foreach ($proc in $targets) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
    } catch {
      Write-Host "  [WARN] Failed to stop PID=$($proc.ProcessId): $($_.Exception.Message)"
    }
  }
}

Set-Location $repoRoot
$env:OPENWHISPR_CHANNEL = "development"
$env:OPENWHISPR_SESSION_MARKER = $Marker
if (-not $env:OPENWHISPR_LOG_LEVEL) {
  $env:OPENWHISPR_LOG_LEVEL = "debug"
}

Write-Host "Env OPENWHISPR_CHANNEL=$env:OPENWHISPR_CHANNEL"
Write-Host "Env OPENWHISPR_SESSION_MARKER=$env:OPENWHISPR_SESSION_MARKER"
Write-Host "Env OPENWHISPR_LOG_LEVEL=$env:OPENWHISPR_LOG_LEVEL"

if ($DryRun) {
  Write-Host "Dry run enabled, skip npm run dev."
  exit 0
}

Write-Host "Ensuring nircmd fallback is available..."
npm run download:nircmd
if ($LASTEXITCODE -ne 0) {
  Write-Host "[WARN] download:nircmd failed. Dev will continue with available paste tools."
}

Write-Host "Starting: npm run dev"

npm run dev
