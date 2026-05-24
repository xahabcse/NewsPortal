@echo off
REM News Portal - Deployment Script for Windows
REM Simple deployment for Docker Desktop on Windows

setlocal EnableDelayedExpansion

cd /d "%~dp0.."
set ROOT_DIR=%CD%

set MONITORING_FILE=

:print_section
echo.
echo ==============================
echo %~1
echo ==============================
echo.
goto :eof

:print_success
echo [OK] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

:print_warning
echo [WARN] %~1
goto :eof

:print_info
echo [INFO] %~1
goto :eof

:dc
if defined MONITORING_FILE (
    docker compose -f docker-compose.yml -f %MONITORING_FILE% %*
) else (
    docker compose -f docker-compose.yml %*
)
goto :eof

:main
call :print_section "NewsPortal Deployment - Windows"
call :print_info "Project: %ROOT_DIR%"
call :print_info "Platform: Windows (Docker Desktop)"

REM Check for .env file
if not exist ".env" (
    call :print_error "No .env file found in project root."
    echo Create a .env file with the required variables before deploying.
    echo See README.md (Environment Variables section) for the full list.
    exit /b 1
) else (
    call :print_success ".env file exists"
)

REM Create logs directories
if not exist "logs\web" mkdir "logs\web"
if not exist "logs\mcp" mkdir "logs\mcp"

echo.
echo Select option:
echo 1) Start all services
echo 2) Start with monitoring (Grafana, Prometheus, Loki)
echo 3) Stop all services
echo 4) Stop and remove all (including volumes)
echo 5) View logs
echo 6) Health check
echo.
set /p option="Enter option (1-6): "

if "%option%"=="1" goto :start_services
if "%option%"=="2" goto :start_with_monitoring
if "%option%"=="3" goto :stop_services
if "%option%"=="4" goto :remove_all
if "%option%"=="5" goto :view_logs
if "%option%"=="6" goto :health_check

call :print_error "Invalid option"
exit /b 1

:start_services
set MONITORING_FILE=
call :print_info "Starting all services..."
call :dc pull >nul 2>&1
call :dc up -d --build
call :health_check
goto :end

:start_with_monitoring
set MONITORING_FILE=docker-compose.monitoring.windows.yml
call :print_info "Starting all services with monitoring stack..."
call :print_info "Using: %MONITORING_FILE%"
call :dc pull >nul 2>&1
call :dc up -d --build
call :health_check
goto :end

:stop_services
set MONITORING_FILE=
call :print_info "Stopping all services..."
call :dc down
call :print_success "All containers stopped"
goto :end

:remove_all
set MONITORING_FILE=
call :print_warning "This will remove ALL data including databases!"
set /p confirm="Type 'yes' to confirm: "
if "%confirm%"=="yes" (
    call :dc down -v
    call :print_success "All containers and volumes removed"
) else (
    call :print_info "Cancelled"
)
goto :end

:view_logs
set MONITORING_FILE=
call :print_info "Showing logs (Ctrl+C to exit)..."
call :dc logs -f
goto :end

:health_check
call :print_section "Health Check"
call :dc ps >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Compose services are not running"
    goto :end
)

echo.
echo Service Status:
call :dc ps

echo.
echo Resource Usage:
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | findstr newsportal || echo No containers found

call :print_success "Health check complete"
call :print_services_info
goto :end

:print_services_info
call :print_section "Services Information"

echo Main Services:
echo   - Web UI:       http://localhost:5000
echo   - API:          http://localhost:8080
echo   - PostgreSQL:   localhost:5432
echo   - MongoDB:      localhost:27017
echo   - Redis:        localhost:6379
echo   - Seq Logging:  http://localhost:8081

if defined MONITORING_FILE (
    echo.
    echo Monitoring Stack:
    echo   - Grafana:    http://localhost:3001 (admin/admin123)
    echo   - Prometheus: http://localhost:9090
    echo   - Loki:       http://localhost:3100
    echo   - cAdvisor:   http://localhost:8088
    echo   - Note: node-exporter and promtail are Linux-only
)
goto :eof

:end
endlocal
