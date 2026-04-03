# goto-app setup script
# Edits the hosts file, installs npm dependencies, and registers the Windows Service.
# Must run as Administrator (self-elevates if needed).

param()

# ---------------------------------------------------------------------------
# Self-elevation: relaunch as Administrator if not already
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
$hostEntry = "127.0.0.1`tgoto"

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  goto-app Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1: Hosts file
# ---------------------------------------------------------------------------
Write-Host "[1/4] Updating hosts file..." -ForegroundColor Yellow

$hostsContent = Get-Content $hostsFile -Raw -ErrorAction SilentlyContinue
if ($hostsContent -match '\bgoto\b') {
    Write-Host "      'goto' already exists in hosts file, skipping." -ForegroundColor Gray
} else {
    try {
        Add-Content -Path $hostsFile -Value "`n$hostEntry" -Encoding ASCII
        Write-Host "      Added: $hostEntry" -ForegroundColor Green
    } catch {
        Write-Host "      ERROR: Could not update hosts file." -ForegroundColor Red
        Write-Host "      $_" -ForegroundColor Red
        exit 1
    }
}

# ---------------------------------------------------------------------------
# Step 2: npm install
# ---------------------------------------------------------------------------
Write-Host "[2/4] Installing npm dependencies..." -ForegroundColor Yellow

Set-Location $appDir
$npmResult = npm install 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: npm install failed." -ForegroundColor Red
    Write-Host $npmResult
    exit 1
}
Write-Host "      Dependencies installed." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Install Windows Service
# ---------------------------------------------------------------------------
Write-Host "[3/4] Installing Windows Service..." -ForegroundColor Yellow

node "$appDir\install-service.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Service installation failed." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# Step 4: Flush DNS cache
# ---------------------------------------------------------------------------
Write-Host "[4/4] Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "      DNS cache flushed." -ForegroundColor Green

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Open your browser and go to:" -ForegroundColor White
Write-Host "  http://goto/" -ForegroundColor Cyan
Write-Host ""
Write-Host "  The service 'goto-app' starts automatically with Windows."
Write-Host "  To manage it: services.msc -> goto-app"
Write-Host ""
Read-Host "Press Enter to close"
