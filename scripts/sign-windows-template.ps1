# Windows Code Signing Script Template
# This script signs the Windows installer with a code signing certificate
# 
# Usage: ./scripts/sign-windows-template.ps1 <path-to-installer>
#
# Prerequisites:
# - Code signing certificate (PFX file or certificate in Windows Certificate Store)
# - SignTool.exe (included with Windows SDK)
#
# Configuration options (choose one):
# 1. PFX file: Set CERT_PFX_PATH and CERT_PASSWORD environment variables
# 2. Certificate Store: Set CERT_SHA256 environment variable with certificate fingerprint

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

# Option 1: Sign with PFX file
if ($env:CERT_PFX_PATH) {
    if (-not (Test-Path $env:CERT_PFX_PATH)) {
        Write-Error "Certificate PFX file not found: $env:CERT_PFX_PATH"
        exit 1
    }
    
    $signtool = "signtool"
    & $signtool sign /f $env:CERT_PFX_PATH /p $env:CERT_PASSWORD /tr http://timestamp.digicert.com /td sha256 /fd sha256 $FilePath
}
# Option 2: Sign with certificate from Windows Certificate Store
elseif ($env:CERT_SHA256) {
    $signtool = "signtool"
    & $signtool sign /sha256 $env:CERT_SHA256 /tr http://timestamp.digicert.com /td sha256 /fd sha256 $FilePath
}
else {
    Write-Warning "No code signing certificate configured. Set CERT_PFX_PATH or CERT_SHA256 environment variable."
    Write-Warning "Skipping code signing for: $FilePath"
    exit 0
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to sign $FilePath"
    exit 1
}

Write-Host "Successfully signed: $FilePath"
exit 0
