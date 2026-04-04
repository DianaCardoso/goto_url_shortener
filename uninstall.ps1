# goto-app uninstall script
# Stops and removes the Windows Service, removes hosts file entry, flushes DNS.
# Must run as Administrator (self-elevates if needed).

param()

function Get-DefaultValue {
    param(
        [string]$Value,
        [string]$Fallback
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Fallback
    }

    return $Value.Trim()
}

# ---------------------------------------------------------------------------
# Self-elevation
# ---------------------------------------------------------------------------
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Requesting Administrator privileges..."
    $args = "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    Start-Process powershell -ArgumentList $args -Verb RunAs
    exit
}

$appDir    = $PSScriptRoot
$hostsFile = "C:\Windows\System32\drivers\etc\hosts"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "  goto-app Uninstall" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow
Write-Host ""

$selectedHostname = Get-DefaultValue (Read-Host "Hostname to remove from hosts file [goto]") "goto"
$escapedHostname = [regex]::Escape($selectedHostname)

# ---------------------------------------------------------------------------
# Step 1: Remove Windows Service
# ---------------------------------------------------------------------------
Write-Host "[1/3] Removing Windows Service..." -ForegroundColor Yellow

node "$appDir\uninstall-service.js"
Write-Host "      Service removal requested." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 2: Remove hosts file entry
# ---------------------------------------------------------------------------
Write-Host "[2/3] Removing hosts file entry..." -ForegroundColor Yellow

$lines = Get-Content $hostsFile | Where-Object { $_ -notmatch "(?m)^[^#]*\b$escapedHostname\b" }
Set-Content -Path $hostsFile -Value $lines -Encoding ASCII
Write-Host "      Removed '$selectedHostname' from hosts file." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Flush DNS cache
# ---------------------------------------------------------------------------
Write-Host "[3/3] Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "      DNS cache flushed." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Uninstall complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Your aliases are still saved in: $appDir\data.json"
Write-Host "  You can safely delete the $appDir folder."
Write-Host ""
Read-Host "Press Enter to close"
