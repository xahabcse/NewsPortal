# NewsPortal – Windows Deployment Script (PowerShell)
# Mirrors deploy.sh for Windows / Docker Desktop
# Run from repo root OR script\ directory:
#   .\script\deploy.ps1

$ErrorActionPreference = "Stop"

# Resolve root dir regardless of working directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir   = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RootDir

# ---------- Colour helpers ----------
function Print-Section($msg) {
    Write-Host ""
    Write-Host ("=" * 42) -ForegroundColor Blue
    Write-Host "  $msg"
    Write-Host ("=" * 42) -ForegroundColor Blue
}
function Print-Success($msg) { Write-Host "[OK]    $msg" -ForegroundColor Green  }
function Print-Error($msg)   { Write-Host "[ERROR] $msg" -ForegroundColor Red    }
function Print-Warning($msg) { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Print-Info($msg)    { Write-Host "[INFO]  $msg" -ForegroundColor Cyan   }

# ---------- State ----------
$global:Platform       = "windows"
$global:MonitoringFile = ""

# ---------- docker compose wrapper ----------
function dc([string[]]$CmdArgs) {
    $base = @("compose", "-f", "docker-compose.yml")
    if ($global:MonitoringFile -ne "") {
        $base += @("-f", $global:MonitoringFile)
    }
    & docker @($base + $CmdArgs)
}

# ---------- Platform selection ----------
function Select-Platform {
    Print-Section "Select Platform"
    Write-Host "  1) Windows (Docker Desktop)"
    Write-Host "  2) Ubuntu Server (Linux)"
    Write-Host ""
    $choice = Read-Host "Enter platform (1-2, default 1)"
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

    switch ($choice) {
        "1" {
            $global:Platform       = "windows"
            $global:MonitoringFile = "docker-compose.monitoring.windows.yml"
            Print-Success "Windows mode selected"
        }
        "2" {
            $global:Platform       = "ubuntu"
            $global:MonitoringFile = "docker-compose.monitoring.yml"
            Print-Success "Ubuntu Server mode selected"
        }
        default { Print-Error "Invalid selection"; exit 1 }
    }
}

# ---------- Ensure .env ----------
function Ensure-Env {
    if (-not (Test-Path ".env")) {
        Print-Warning "No .env file found. Creating from .env.example..."
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Print-Success "Created .env - please update passwords/secrets before deploying."
        } else {
            Print-Error ".env.example not found"; exit 1
        }
    } else {
        Print-Success ".env file exists"
    }
}

# ---------- Smart pull (skip build-only services) ----------
function Smart-Pull {
    Print-Info "[Step 1/3] Pulling external images..."

    # Get all service names
    $services = (dc @("config", "--services")) -split "`n" |
                ForEach-Object { $_.Trim() } |
                Where-Object   { $_ -ne "" }

    # Get full config as text and find services that have a build: key
    $fullConfig  = (dc @("config")) -join "`n"
    $pullable    = @()

    foreach ($svc in $services) {
        # A service with a build section appears as "<svc>:\n    build:"
        if ($fullConfig -notmatch "(?m)^\s{2}$([regex]::Escape($svc)):\s*\n(?:.*\n)*?\s{4}build:") {
            $pullable += $svc
        }
    }

    if ($pullable.Count -gt 0) {
        Print-Info "Pulling: $($pullable -join ', ')"
        dc (@("pull") + $pullable)
    } else {
        Print-Info "No external images to pull."
    }
}

# ---------- Health check ----------
function Health-Check {
    Print-Section "Detailed Health Check"

    $services = (dc @("config", "--services")) -split "`n" |
                ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

    $allHealthy = $true
    Write-Host ("{0,-28} {1,-12} {2}" -f "SERVICE", "STATUS", "IMAGE") -ForegroundColor Cyan
    Write-Host ("-" * 72) -ForegroundColor DarkGray

    foreach ($svc in $services) {
        $state = (dc @("ps", $svc, "--format", "{{.State}}") 2>$null) -join "" | ForEach-Object { $_.Trim() }
        $image = (dc @("ps", $svc, "--format", "{{.Image}}")  2>$null) -join "" | ForEach-Object { $_.Trim() }

        if ($state -match "running") {
            Write-Host ("{0,-28}" -f $svc)     -NoNewline
            Write-Host ("{0,-12}" -f "Running") -ForegroundColor Green -NoNewline
            Write-Host $image
        } else {
            Write-Host ("{0,-28}" -f $svc)     -NoNewline
            Write-Host ("{0,-12}" -f $(if ($state) { $state } else { "Stopped" })) -ForegroundColor Red -NoNewline
            Write-Host $image
            $allHealthy = $false
        }
    }

    Write-Host ""
    Print-Info "Real-Time Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}" |
        Where-Object { $_ -match "newsportal|NAME" }

    if ($allHealthy) {
        Print-Success "All services are running."
        Print-ServicesInfo
    } else {
        Print-Error "Some services are not running properly. Check logs with option 5."
    }
}

# ---------- Service URLs ----------
function Print-ServicesInfo {
    Print-Section "Services Information"
    Write-Host "  Main Services:" -ForegroundColor Cyan
    Write-Host "    Web UI:       http://localhost:5000"
    Write-Host "    API:          http://localhost:8080"
    Write-Host "    PostgreSQL:   localhost:5432"
    Write-Host "    MongoDB:      localhost:27017"
    Write-Host "    Redis:        localhost:6379"
    Write-Host "    Seq Logging:  http://localhost:8081"

    if ($global:MonitoringFile -ne "") {
        Write-Host ""
        Write-Host "  Monitoring Stack:" -ForegroundColor Cyan
        Write-Host "    Grafana:      http://localhost:3001  (admin / admin123)"
        Write-Host "    Prometheus:   http://localhost:9090"
        Write-Host "    Loki:         http://localhost:3100"
        Write-Host "    cAdvisor:     http://localhost:8088"
        if ($global:Platform -eq "ubuntu") {
            Write-Host "    Node Exp:     http://localhost:9100"
        }
    }
}

# ---------- Clean rebuild ----------
function Clean-And-Rebuild {
    Print-Section "Clean Build - Rebuild API and Web Client"
    Print-Warning "This will stop services, remove old images, and rebuild from scratch."
    $confirm = Read-Host "Continue? (y/n, default n)"
    if ($confirm -notmatch "^[yY]$") { Print-Info "Cancelled"; return }

    Print-Info "[Step 1/4] Stopping services..."
    try { dc @("down") } catch {}
    Print-Success "Services stopped"

    Print-Info "[Step 2/4] Removing old images..."
    "newsportal-api:latest", "newsportal-web-client:latest", "newsportal-mcp:latest" | ForEach-Object {
        try { docker rmi $_ 2>$null } catch {}
    }
    Print-Success "Old images removed"

    Smart-Pull

    Print-Info "[Step 3/4] Building fresh images (this may take a while)..."
    dc @("build", "--no-cache", "api", "web", "mcpserver")
    Print-Success "Build complete"

    Print-Info "[Step 4/4] Starting services..."
    dc @("up", "-d")
    Print-Success "Services started"

    Print-Info "Waiting for containers to initialise..."
    Start-Sleep -Seconds 5
    Health-Check
}

# =====================================================================
# MAIN
# =====================================================================
Print-Section "NewsPortal Deployment"
Print-Info "Project root: $RootDir"

Select-Platform
Ensure-Env

# Ensure log directories exist
New-Item -ItemType Directory -Force -Path "logs\web", "logs\mcp" | Out-Null

Write-Host ""
Write-Host "Select option:" -ForegroundColor White
Write-Host "  1) Start all services"
Write-Host "  2) Start with monitoring (Grafana, Prometheus, Loki)"
Write-Host "  3) Stop all services"
Write-Host "  4) Stop and remove all (including volumes)"
Write-Host "  5) View logs"
Write-Host "  6) Health check"
Write-Host "  7) Clean build (rebuild API, Web Client from scratch)"
Write-Host ""
$option = Read-Host "Enter option (1-7)"

switch ($option) {
    "1" {
        $global:MonitoringFile = ""
        Smart-Pull
        Print-Info "[Step 2/3] Building and starting containers..."
        dc @("up", "-d", "--build")
        Print-Info "[Step 3/3] Verifying health..."
        Health-Check
    }
    "2" {
        Smart-Pull
        Print-Info "[Step 2/3] Building and starting monitoring stack..."
        dc @("up", "-d", "--build")
        Print-Info "[Step 3/3] Verifying health..."
        Health-Check
    }
    "3" {
        Print-Info "Stopping all services..."
        dc @("down")
        Print-Success "All containers stopped"
    }
    "4" {
        Print-Warning "This will remove ALL data including databases!"
        $confirm = Read-Host "Type 'yes' to confirm"
        if ($confirm -eq "yes") {
            dc @("down", "-v")
            Print-Success "All containers and volumes removed"
        } else {
            Print-Info "Cancelled"
        }
    }
    "5" {
        Print-Info "Showing logs (Ctrl+C to exit)..."
        dc @("logs", "-f")
    }
    "6" { Health-Check }
    "7" { Clean-And-Rebuild }
    default { Print-Error "Invalid option. Enter 1-7."; exit 1 }
}
