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

smart_pull() {
    print_info "[Step 1/3] Pulling external images..."
    # Filter services that don't have a 'build' section to avoid access denied errors
    local pullable_services=""
    for service in $(dc config --services); do
        if ! dc config "$service" | grep -q "build:"; then
            pullable_services="$pullable_services $service"
        fi
    done
    
    if [ -n "$pullable_services" ]; then
        # shellcheck disable=SC2086
        dc pull $pullable_services
    else
        print_info "No external images to pull."
    fi
}

health_check() {
    print_section "Detailed Health Check"
    
    if ! dc ps >/dev/null 2>&1; then
        print_error "Docker Compose services are not running"
        return 1
    fi

    local all_healthy=true
    mapfile -t services < <(dc config --services)

    echo -e "${CYAN}%-25s %-15s %-30s${NC}" "SERVICE" "STATUS" "IMAGE"
    echo -e "${CYAN}--------------------------------------------------------------------------${NC}"

    for service in "${services[@]}"; do
        status=$(dc ps "$service" --format "{{.Status}}" 2>/dev/null || echo "Not found")
        image=$(dc ps "$service" --format "{{.Image}}" 2>/dev/null || echo "-")
        
        if echo "$status" | grep -q "Up"; then
            printf "%-25s %b%-15s%b %-30s\n" "$service" "${GREEN}" "Running" "${NC}" "$image"
        else
            printf "%-25s %b%-15s%b %-30s\n" "$service" "${RED}" "Stopped" "${NC}" "$image"
            all_healthy=false
        fi
    done

    echo ""
    print_info "Real-Time Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep newsportal || echo "No containers found"

    if [ "$all_healthy" = true ]; then
        print_success "All services are running as expected."
        print_services_info
        return 0
    fi

    print_error "Some services are not running properly."
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

clean_and_rebuild() {
    print_section "Clean Build - Rebuild API and Web Client"
    
    print_warning "This will stop services, remove old images, and rebuild from scratch"
    read -r -p "Continue? (y/n, default n): " confirm
    if [ "${confirm:-n}" != "y" ] && [ "${confirm:-n}" != "Y" ]; then
        print_info "Cancelled"
        return
    fi

    # Stop services
    print_info "[Step 1/4] Stopping services..."
    dc down 2>/dev/null || true
    print_success "Services stopped"

    # Remove old images for api and web
    print_info "[Step 2/4] Removing old API and Web Client images..."
    docker rmi newsportal-api:latest 2>/dev/null || true
    docker rmi newsportal-web-client:latest 2>/dev/null || true
    docker rmi newsportal-mcp:latest 2>/dev/null || true
    print_success "Old images removed"

    # Pull external images
    smart_pull

    # Rebuild and start
    print_info "[Step 3/4] Building fresh images (this may take a while)..."
    dc build --no-cache api web mcpserver
    print_success "Build complete"

    print_info "[Step 4/4] Starting services..."
    dc up -d
    print_success "Services started"

    print_info "Verifying health..."
    sleep 5
    health_check
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
echo "7) Clean build (rebuild API, Web Client from scratch)"
echo ""
read -r -p "Enter option (1-7): " option

case "$option" in
    1)
        MONITORING_FILE=""
        smart_pull
        print_info "[Step 2/3] Building and starting containers..."
        dc up -d --build
        print_info "[Step 3/3] Verifying health..."
        health_check
        ;;
    2)
        smart_pull
        print_info "[Step 2/3] Building and starting monitoring stack..."
        dc up -d --build
        print_info "[Step 3/3] Verifying health..."
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
    7)
        clean_and_rebuild
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac
