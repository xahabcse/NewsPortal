# News Portal - Deployment Script for Windows PowerShell
# Simple deployment for Docker Desktop on Windows

param(
    [switch]$Monitoring,
    [switch]$Stop,
    [switch]$Remove,
    [switch]$Logs,
    [switch]$Health
)

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Push-Location $RootDir

$MonitoringFile = $null

function Print-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "==============================" -ForegroundColor Blue
    Write-Host $Title -ForegroundColor Blue
    Write-Host "==============================" -ForegroundColor Blue
    Write-Host ""
}

function Print-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Print-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Print-Warning { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Print-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }

function Invoke-DockerCompose {
    $composeFiles = @("-f", "docker-compose.yml")
    if ($MonitoringFile) {
        $composeFiles += @("-f", $MonitoringFile)
    }
    docker compose $composeFiles $args
}

function Check-Env {
    if (-not (Test-Path ".env")) {
        Print-Warning "No .env file found. Creating from .env.example..."
        if (Test-Path ".env.example") {
            Copy-Item .env.example .env
            Print-Success "Created .env file"
            Print-Warning "Please edit .env and update passwords/secrets."
        } else {
            Print-Error ".env.example not found"
            exit 1
        }
    } else {
        Print-Success ".env file exists"
    }
}

function Health-Check {
    Print-Section "Detailed Health Check"
    
    $psOutput = Invoke-DockerCompose ps 2>$null
    if ($LASTEXITCODE -ne 0) {
        Print-Error "Docker Compose services are not running"
        return
    }

    $services = Invoke-DockerCompose ps --format json | ConvertFrom-Json
    
    Write-Host ("{0,-25} {1,-15} {2,-30}" -f "SERVICE", "STATUS", "IMAGE") -ForegroundColor Cyan
    Write-Host ("-" * 70) -ForegroundColor Cyan

    $allHealthy = $true
    foreach ($svc in $services) {
        $status = if ($svc.State -eq "running") { "Running" } else { "Stopped" }
        $color = if ($svc.State -eq "running") { "Green" } else { "Red"; $allHealthy = $false }
        
        Write-Host ("{0,-25} " -f $svc.Service) -NoNewline
        Write-Host ("{0,-15}" -f $status) -ForegroundColor $color -NoNewline
        Write-Host (" {0,-30}" -f $svc.Image)
    }

    Print-Section "Resource Usage"
    docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}" | Select-String "newsportal"

    if ($allHealthy) {
        Print-Success "All services are running as expected."
        Print-Services-Info
    } else {
        Print-Error "Some services are not running properly."
    }
}

function Print-Services-Info {
    Print-Section "Services Information"
    
    Write-Host "Main Services:" -ForegroundColor Cyan
    Write-Host "  - Web UI:       http://localhost:5000"
    Write-Host "  - API:          http://localhost:8080"
    Write-Host "  - PostgreSQL:   localhost:5432"
    Write-Host "  - MongoDB:      localhost:27017"
    Write-Host "  - Redis:        localhost:6379"
    Write-Host "  - Seq Logging:  http://localhost:8081"
    
    if ($MonitoringFile) {
        Write-Host "`nMonitoring Stack:" -ForegroundColor Cyan
        Write-Host "  - Grafana:    http://localhost:3001 (admin/admin123)"
        Write-Host "  - Prometheus: http://localhost:9090"
        Write-Host "  - Loki:       http://localhost:3100"
        Write-Host "  - cAdvisor:   http://localhost:8088"
        Write-Host "  - Note: node-exporter and promtail are Linux-only" -ForegroundColor Gray
    }
}

# Main execution
Print-Section "NewsPortal Deployment - Windows (PowerShell)"
Print-Info "Project: $RootDir"
Print-Info "Platform: Windows (Docker Desktop)"

Check-Env

# Create logs directories
$logsWeb = Join-Path $RootDir "logs\web"
$logsMcp = Join-Path $RootDir "logs\mcp"
if (-not (Test-Path $logsWeb)) { New-Item -ItemType Directory -Path $logsWeb | Out-Null }
if (-not (Test-Path $logsMcp)) { New-Item -ItemType Directory -Path $logsMcp | Out-Null }

# If parameters provided, run directly
if ($Stop) {
    Print-Info "Stopping all services..."
    Invoke-DockerCompose down
    Print-Success "All containers stopped"
    Pop-Location
    exit 0
}

if ($Remove) {
    Print-Warning "This will remove ALL data including databases!"
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -eq "yes") {
        Invoke-DockerCompose down -v
        Print-Success "All containers and volumes removed"
    } else {
        Print-Info "Cancelled"
    }
    Pop-Location
    exit 0
}

if ($Logs) {
    Print-Info "Showing logs (Ctrl+C to exit)..."
    Invoke-DockerCompose logs -f
    Pop-Location
    exit 0
}

if ($Health) {
    Health-Check
    Pop-Location
    exit 0
}

# Interactive mode
Write-Host ""
Write-Host "Select option:" -ForegroundColor Yellow
Write-Host "1) Start all services"
Write-Host "2) Start with monitoring (Grafana, Prometheus, Loki)"
Write-Host "3) Stop all services"
Write-Host "4) Stop and remove all (including volumes)"
Write-Host "5) View logs"
Write-Host "6) Health check"
Write-Host ""
$option = Read-Host "Enter option (1-6)"

switch ($option) {
    "1" {
        $MonitoringFile = $null
        Print-Info "[Step 1/3] Pulling images (showing progress)..."
        Invoke-DockerCompose pull
        Print-Info "[Step 2/3] Building and starting containers..."
        Invoke-DockerCompose up -d --build
        Print-Info "[Step 3/3] Verifying health..."
        Health-Check
    }
    "2" {
        $MonitoringFile = "docker-compose.monitoring.windows.yml"
        Print-Info "[Step 1/3] Pulling images (showing progress)..."
        Invoke-DockerCompose pull
        Print-Info "[Step 2/3] Building and starting monitoring stack..."
        Invoke-DockerCompose up -d --build
        Print-Info "[Step 3/3] Verifying health..."
        Health-Check
    }
    "3" {
        $MonitoringFile = $null
        Print-Info "Stopping all services..."
        Invoke-DockerCompose down
        Print-Success "All containers stopped"
    }
    "4" {
        $MonitoringFile = $null
        Print-Warning "This will remove ALL data including databases!"
        $confirm = Read-Host "Type 'yes' to confirm"
        if ($confirm -eq "yes") {
            Invoke-DockerCompose down -v
            Print-Success "All containers and volumes removed"
        } else {
            Print-Info "Cancelled"
        }
    }
    "5" {
        $MonitoringFile = $null
        Print-Info "Showing logs (Ctrl+C to exit)..."
        Invoke-DockerCompose logs -f
    }
    "6" {
        Health-Check
    }
    default {
        Print-Error "Invalid option"
        exit 1
    }
}

Pop-Location
