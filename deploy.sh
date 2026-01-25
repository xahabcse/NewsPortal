#!/bin/bash

# News Portal - Quick Deployment Script
# This script helps you deploy the News Portal application quickly

set -e

echo "======================================"
echo "News Portal - Deployment Script"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}======================================"
    echo "$1"
    echo -e "======================================${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to validate deployment
validate_deployment() {
    print_section "Deployment Configuration Validation"
    
    local errors=0
    local warnings=0

    # 1. Check Docker installation
    if command -v docker &> /dev/null; then
        print_success "Docker is installed: $(docker --version)"
    else
        print_error "Docker is not installed"
        ((errors++))
    fi

    if command -v docker compose &> /dev/null; then
        print_success "Docker Compose is installed: $(docker compose version)"
    else
        print_error "Docker Compose is not installed"
        ((errors++))
    fi

    # 2. Check critical files
    local critical_files=(
        "NewsPortal.sln"
        "docker-compose.yml"
        ".dockerignore"
        "src/NewsPortal.Client/Dockerfile"
        "src/NewsPortal.Client/nginx.conf"
        # Check for API Dockerfile (case insensitive backup)
        "src/NewsPortal.API/Dockerfile"
        "src/NewsPortal.McpServer/Dockerfile"
    )

    for file in "${critical_files[@]}"; do
        if [ -f "$file" ]; then
            print_success "Found: $file"
        elif [ "$file" == "src/NewsPortal.API/Dockerfile" ] && [ -f "src/NewsPortal.Api/Dockerfile" ]; then
             print_success "Found: src/NewsPortal.Api/Dockerfile (lowercase path)"
        else
            print_error "Missing critical file: $file"
            ((errors++))
        fi
    done

    # 3. Check .env
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

    if [ $errors -gt 0 ]; then
        print_error "Validation failed with $errors errors and $warnings warnings."
        return 1
    else
        print_success "Validation passed with $warnings warnings."
        return 0
    fi
}

# Function to check health
health_check() {
    print_section "System Health Check"
    
    if ! docker compose ps > /dev/null 2>&1; then
        print_error "Docker Compose not running"
        return 1
    fi

    local services=("postgres" "mongodb" "redis" "seq" "web" "api" "mcpserver")
    local all_healthy=true

    for service in "${services[@]}"; do
        if docker compose ps "$service" | grep -q "Up"; then
            print_success "Service $service is running"
        else
            print_error "Service $service is NOT running"
            all_healthy=false
        fi
    done

    echo ""
    echo "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep newsportal

    if [ "$all_healthy" = true ]; then
        print_success "All services are healthy"
        return 0
    else
        print_error "Some services are unhealthy"
        return 1
    fi
}

echo -e "${GREEN}✓ Docker prerequisites checked${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Please edit .env file and update the passwords!${NC}"
        echo ""
        read -p "Do you want to edit .env now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create logs directories
mkdir -p logs/web logs/mcp
chmod -R 755 logs 2>/dev/null || true

# Ask deployment type
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
read -p "Enter option (1-7): " option

case $option in
    1)
        validate_deployment
        ;;
    2)
        if validate_deployment; then
            echo "Starting fresh deployment..."
            docker compose pull postgres mongodb redis seq
            docker compose up -d --build
            health_check
        fi
        ;;
    3)
        echo "Updating deployment..."
        docker compose build
        docker compose up -d
        health_check
        ;;
    4)
        echo "Starting containers..."
        docker compose up -d
        health_check
        ;;
    5)
        echo "Stopping containers..."
        docker compose down
        echo -e "${GREEN}✓ All containers stopped${NC}"
        ;;
    6)
        echo -e "${RED}WARNING: This will remove all data including databases!${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            docker compose down -v
            echo -e "${GREEN}✓ All containers and volumes removed${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    7)
        health_check
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac
