#!/bin/bash

# News Portal - Deployment Script
# Simple deployment for Windows (Docker Desktop) and Ubuntu Server

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PLATFORM="windows"
MONITORING_FILE=""

print_section() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo "$1"
    echo -e "${BLUE}======================================${NC}"
}

print_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

print_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

dc() {
    if [ -n "$MONITORING_FILE" ]; then
        docker compose -f docker-compose.yml -f "$MONITORING_FILE" "$@"
    else
        docker compose -f docker-compose.yml "$@"
    fi
}

select_platform() {
    print_section "Select Platform"
    echo "1) Windows (Docker Desktop)"
    echo "2) Ubuntu Server (Linux)"
    echo ""
    read -r -p "Enter platform (1-2, default 1): " platform_choice

    case "${platform_choice:-1}" in
        1)
            PLATFORM="windows"
            MONITORING_FILE="docker-compose.monitoring.windows.yml"
            print_success "Windows mode selected"
            ;;
        2)
            PLATFORM="ubuntu"
            MONITORING_FILE="docker-compose.monitoring.yml"
            print_success "Ubuntu Server mode selected"
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
}

ensure_env() {
    if [ ! -f .env ]; then
        print_warning "No .env file found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env file"
            print_warning "Please edit .env and update passwords/secrets."
        else
            print_error ".env.example not found"
            exit 1
        fi
    else
        print_success ".env file exists"
    fi
}

health_check() {
    print_section "Health Check"
    
    if ! dc ps >/dev/null 2>&1; then
        print_error "Docker Compose services are not running"
        return 1
    fi

    local all_healthy=true
    mapfile -t services < <(dc config --services)

    for service in "${services[@]}"; do
        if dc ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is NOT running"
            all_healthy=false
        fi
    done

    echo ""
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep newsportal || echo "No containers found"

    if [ "$all_healthy" = true ]; then
        print_success "All services healthy"
        print_services_info
        return 0
    fi

    print_error "Some services unhealthy"
    return 1
}

print_services_info() {
    print_section "Services Information"
    
    echo -e "${CYAN}Main Services:${NC}"
    echo "  - Web UI:       http://localhost:5000"
    echo "  - API:          http://localhost:8080"
    echo "  - PostgreSQL:   localhost:5432"
    echo "  - MongoDB:      localhost:27017"
    echo "  - Redis:        localhost:6379"
    echo "  - Seq Logging:  http://localhost:8081"
    
    if [ -n "$MONITORING_FILE" ]; then
        echo ""
        echo -e "${CYAN}Monitoring Stack:${NC}"
        echo "  - Grafana:    http://localhost:3001 (admin/admin123)"
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Loki:       http://localhost:3100"
        if [ "$PLATFORM" = "ubuntu" ]; then
            echo "  - Node Exp:   http://localhost:9100"
            echo "  - Promtail:   (log collector)"
        fi
        echo "  - cAdvisor:   http://localhost:8088"
    fi
}

# Main execution
print_section "NewsPortal Deployment"
print_info "Project: $ROOT_DIR"

select_platform
ensure_env

mkdir -p logs/web logs/mcp
chmod -R 755 logs 2>/dev/null || true

echo ""
echo "Select option:"
echo "1) Start all services"
echo "2) Start with monitoring (Grafana, Prometheus, Loki)"
echo "3) Stop all services"
echo "4) Stop and remove all (including volumes)"
echo "5) View logs"
echo "6) Health check"
echo ""
read -r -p "Enter option (1-6): " option

case "$option" in
    1)
        MONITORING_FILE=""
        print_info "Starting all services..."
        dc pull 2>/dev/null || print_warning "Some images failed to pull"
        dc up -d --build
        health_check
        ;;
    2)
        print_info "Starting all services with monitoring stack..."
        dc pull 2>/dev/null || print_warning "Some images failed to pull"
        dc up -d --build
        health_check
        ;;
    3)
        print_info "Stopping all services..."
        dc down
        print_success "All containers stopped"
        ;;
    4)
        print_warning "This will remove ALL data including databases!"
        read -r -p "Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            dc down -v
            print_success "All containers and volumes removed"
        else
            print_info "Cancelled"
        fi
        ;;
    5)
        print_info "Showing logs (Ctrl+C to exit)..."
        dc logs -f
        ;;
    6)
        health_check
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac
