#!/bin/bash

# News Portal - Deployment Script
# Supports local development mode and Ubuntu server mode

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEPLOY_MODE="ubuntu-server"
COMPOSE_FILE="docker-compose.yml"

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
    docker compose -f "$COMPOSE_FILE" "$@"
}

select_deployment_mode() {
    print_section "Select Deployment Mode"
    echo "1) Development Environment (local Docker dev stack)"
    echo "2) Ubuntu Server Deployment (default)"
    echo ""
    read -r -p "Enter mode (1-2, default 2): " mode

    case "${mode:-2}" in
        1)
            DEPLOY_MODE="development"
            if [ -f "docker-compose.dev.yml" ]; then
                COMPOSE_FILE="docker-compose.dev.yml"
                print_success "Development mode selected with docker-compose.dev.yml"
            else
                COMPOSE_FILE="docker-compose.yml"
                print_warning "docker-compose.dev.yml not found. Falling back to docker-compose.yml for development mode."
            fi
            ;;
        2)
            DEPLOY_MODE="ubuntu-server"
            COMPOSE_FILE="docker-compose.yml"
            print_success "Ubuntu server mode selected"
            ;;
        *)
            print_error "Invalid mode selection"
            exit 1
            ;;
    esac

    print_info "Using compose file: ${COMPOSE_FILE}"
}

validate_deployment() {
    print_section "Deployment Configuration Validation"

    local errors=0
    local warnings=0

    if command -v docker >/dev/null 2>&1; then
        print_success "Docker is installed: $(docker --version)"
    else
        print_error "Docker is not installed"
        ((errors++))
    fi

    if docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is available"
    else
        print_error "Docker Compose is not available"
        ((errors++))
    fi

    local critical_files=(
        "NewsPortal.sln"
        "$COMPOSE_FILE"
        ".dockerignore"
    )

    if [ "$DEPLOY_MODE" = "ubuntu-server" ]; then
        critical_files+=(
            "src/NewsPortal.Client/Dockerfile"
            "src/NewsPortal.Client/nginx.conf"
            "src/NewsPortal.Api/Dockerfile"
            "src/NewsPortal.McpServer/Dockerfile"
        )
    fi

    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found: $file"
        else
            print_error "Missing critical file: $file"
            ((errors++))
        fi
    done

    if [ -f ".env" ]; then
        print_success ".env file exists"
        if grep -q "YourSecurePassword123" .env; then
            print_warning "Using default PostgreSQL password in .env"
            ((warnings++))
        fi
    else
        print_warning ".env file missing (will be created from example)"
        ((warnings++))
    fi

    if [ "$errors" -gt 0 ]; then
        print_error "Validation failed with $errors error(s) and $warnings warning(s)."
        return 1
    fi

    print_success "Validation passed with $warnings warning(s)."
    return 0
}

health_check() {
    print_section "System Health Check"

    if ! dc ps >/dev/null 2>&1; then
        print_error "Docker Compose services are not running for ${COMPOSE_FILE}"
        return 1
    fi

    local all_healthy=true
    mapfile -t services < <(dc config --services)

    for service in "${services[@]}"; do
        if dc ps "$service" | grep -q "Up"; then
            print_success "Service $service is running"
        else
            print_error "Service $service is NOT running"
            all_healthy=false
        fi
    done

    echo ""
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep newsportal || echo "No newsportal containers are currently running."

    if [ "$all_healthy" = true ]; then
        print_success "All services are healthy"
        return 0
    fi

    print_error "Some services are unhealthy or not started"
    return 1
}

print_section "News Portal - Deployment Script"
print_info "Project root: $ROOT_DIR"

select_deployment_mode

if [ ! -f .env ]; then
    print_warning "No .env file found. Creating from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        print_success "Created .env file"
        print_warning "Please edit .env file and update passwords/secrets."
        read -r -p "Do you want to edit .env now? (y/n) " edit_now
        if [[ "${edit_now:-n}" =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        print_error ".env.example not found"
        exit 1
    fi
else
    print_success ".env file exists"
fi

mkdir -p logs/web logs/mcp
chmod -R 755 logs 2>/dev/null || true

echo ""
echo "Select option:"
echo "1) Validate Configuration"
echo "2) Fresh deployment (pull, build, start)"
echo "3) Update deployment (rebuild, restart)"
echo "4) Start existing containers"
echo "5) Stop all containers"
echo "6) Stop and remove all (including volumes)"
echo "7) Health Check"
echo ""
read -r -p "Enter option (1-7): " option

case "$option" in
    1)
        validate_deployment
        ;;
    2)
        if validate_deployment; then
            print_info "Starting fresh deployment (${DEPLOY_MODE})..."
            if [ "$DEPLOY_MODE" = "ubuntu-server" ]; then
                dc pull postgres mongodb redis seq
            fi
            dc up -d --build
            health_check
        fi
        ;;
    3)
        print_info "Updating deployment (${DEPLOY_MODE})..."
        dc build
        dc up -d
        health_check
        ;;
    4)
        print_info "Starting containers..."
        dc up -d
        health_check
        ;;
    5)
        print_info "Stopping containers..."
        dc down
        print_success "All containers stopped"
        ;;
    6)
        print_warning "This will remove all data including databases."
        read -r -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            dc down -v
            print_success "All containers and volumes removed"
        else
            print_info "Cancelled"
        fi
        ;;
    7)
        health_check
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac