# setup-proxy.ps1
# ShipStack Phase 4 — Local Reverse Proxy Setup (Windows)
#
# Run this ONCE to set up the nginx proxy.
# After first run, the proxy starts automatically with Docker Desktop.
#
# Requirements:
#   - Docker Desktop installed and running
#   - Run from the project root directory
#
# Usage:
#   .\setup-proxy.ps1
#   .\setup-proxy.ps1 -Down     # Stop and remove the proxy
#   .\setup-proxy.ps1 -Restart  # Restart the proxy container

param(
    [switch]$Down,
    [switch]$Restart
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$ComposeFile = Join-Path $ProjectRoot "docker-compose.proxy.yml"
$ConfDir     = Join-Path $ProjectRoot "infra\nginx\conf.d"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ShipStack — Reverse Proxy Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Verify Docker is running ──────────────────────────────────────────────────
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "  Docker is running." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# ── Ensure conf.d directory exists ───────────────────────────────────────────
if (-not (Test-Path $ConfDir)) {
    Write-Host "Creating conf.d directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ConfDir -Force | Out-Null
    Write-Host "  Created: $ConfDir" -ForegroundColor Green
} else {
    Write-Host "  conf.d directory exists." -ForegroundColor Green
}

# ── Handle -Down flag ─────────────────────────────────────────────────────────
if ($Down) {
    Write-Host ""
    Write-Host "Stopping proxy..." -ForegroundColor Yellow
    docker compose -f $ComposeFile down
    Write-Host "  Proxy stopped." -ForegroundColor Green
    exit 0
}

# ── Handle -Restart flag ─────────────────────────────────────────────────────
if ($Restart) {
    Write-Host ""
    Write-Host "Restarting proxy..." -ForegroundColor Yellow
    docker compose -f $ComposeFile restart proxy
    Write-Host "  Proxy restarted." -ForegroundColor Green
    exit 0
}

# ── Check if port 80 is available ─────────────────────────────────────────────
Write-Host ""
Write-Host "Checking port 80..." -ForegroundColor Yellow
$port80 = netstat -ano | Select-String ":80 "
if ($port80) {
    Write-Host "  WARNING: Port 80 appears to be in use." -ForegroundColor Yellow
    Write-Host "  Processes using port 80:" -ForegroundColor Yellow
    $port80 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkYellow }
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "  Aborted." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  Port 80 is available." -ForegroundColor Green
}

# ── Start the proxy ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Starting nginx proxy..." -ForegroundColor Yellow
docker compose -f $ComposeFile up -d --pull always

# ── Verify it started ─────────────────────────────────────────────────────────
Start-Sleep -Seconds 2
$running = docker inspect --format "{{.State.Status}}" shipstack-proxy 2>$null
if ($running -ne "running") {
    Write-Host ""
    Write-Host "  ERROR: Proxy container did not start. Check logs:" -ForegroundColor Red
    Write-Host "    docker logs shipstack-proxy" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Proxy is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Deployed apps will be available at:" -ForegroundColor White
Write-Host "    http://<your-project-name>.localhost" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Windows resolves *.localhost to 127.0.0.1 automatically." -ForegroundColor DarkGray
Write-Host "  No hosts file edits needed." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  To stop the proxy:" -ForegroundColor White
Write-Host "    .\setup-proxy.ps1 -Down" -ForegroundColor Cyan
Write-Host ""