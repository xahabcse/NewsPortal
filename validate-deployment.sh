#!/bin/bash

# News Portal - Pre-Deployment Validation Script
# This script validates the setup before deployment to catch errors early

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERROR_COUNT=0
WARNING_COUNT=0

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
    ((ERROR_COUNT++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    ((WARNING_COUNT++))
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_section "News Portal Deployment Validation"

# 1. Check Docker installation
print_section "1. Checking Docker Installation"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker is installed: $DOCKER_VERSION"
else
    print_error "Docker is not installed. Please install Docker first."
    print_info "Visit: https://docs.docker.com/engine/install/"
fi

if command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    print_success "Docker Compose is installed: $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed. Please install Docker Compose."
    print_info "Visit: https://docs.docker.com/compose/install/"
fi

# Test Docker daemon
if docker info &> /dev/null; then
    print_success "Docker daemon is running"
else
    print_error "Docker daemon is not running. Please start Docker."
fi

# 2. Check file structure
print_section "2. Validating File Structure"

# Check critical files
critical_files=(
    "NewsPortal.sln"
    "docker-compose.yml"
    ".dockerignore"
    ".env.example"
    "src/NewsPortal.Web/Dockerfile"
    "src/NewsPortal.McpServer/Dockerfile"
    "src/NewsPortal.Web/NewsPortal.Web.csproj"
    "src/NewsPortal.McpServer/NewsPortal.McpServer.csproj"
    "src/NewsPortal.Application/NewsPortal.Application.csproj"
    "src/NewsPortal.Infrastructure/NewsPortal.Infrastructure.csproj"
    "src/NewsPortal.Core/NewsPortal.Core.csproj"
    "src/NewsPortal.BackgroundJobs/NewsPortal.BackgroundJobs.csproj"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing critical file: $file"
    fi
done

# Check Program.cs files
if [ -f "src/NewsPortal.Web/Program.cs" ]; then
    print_success "Found: src/NewsPortal.Web/Program.cs"
else
    print_error "Missing: src/NewsPortal.Web/Program.cs"
fi

if [ -f "src/NewsPortal.McpServer/Program.cs" ]; then
    print_success "Found: src/NewsPortal.McpServer/Program.cs"
else
    print_error "Missing: src/NewsPortal.McpServer/Program.cs"
fi

# 3. Validate configuration files
print_section "3. Validating Configuration Files"

# Check .env file
if [ -f ".env" ]; then
    print_success ".env file exists"

    # Check for default passwords
    if grep -q "YourSecurePassword123" .env; then
        print_warning ".env file contains default PostgreSQL password. Please change it!"
    else
        print_success "PostgreSQL password has been changed"
    fi

    if grep -q "MongoPassword123" .env; then
        print_warning ".env file contains default MongoDB password. Please change it!"
    else
        print_success "MongoDB password has been changed"
    fi
else
    print_warning ".env file not found. It will be created from .env.example during deployment."
fi

# Validate docker-compose.yml syntax
if [ -f "docker-compose.yml" ]; then
    if docker compose config > /dev/null 2>&1; then
        print_success "docker-compose.yml syntax is valid"
    else
        print_error "docker-compose.yml has syntax errors"
        docker compose config
    fi
fi

# 4. Check Dockerfiles
print_section "4. Validating Dockerfiles"

# Validate Web Dockerfile
if [ -f "src/NewsPortal.Web/Dockerfile" ]; then
    # Check for multi-stage build
    if grep -q "FROM.*AS build" src/NewsPortal.Web/Dockerfile; then
        print_success "Web Dockerfile uses multi-stage build"
    else
        print_warning "Web Dockerfile might not use multi-stage build"
    fi

    # Check for COPY instructions
    if grep -q "COPY.*NewsPortal.sln" src/NewsPortal.Web/Dockerfile; then
        print_success "Web Dockerfile copies solution file"
    else
        print_error "Web Dockerfile missing solution file copy"
    fi

    # Check for proper project references
    if grep -q "NewsPortal.Web.csproj" src/NewsPortal.Web/Dockerfile && \
       grep -q "NewsPortal.Application.csproj" src/NewsPortal.Web/Dockerfile && \
       grep -q "NewsPortal.Infrastructure.csproj" src/NewsPortal.Web/Dockerfile && \
       grep -q "NewsPortal.Core.csproj" src/NewsPortal.Web/Dockerfile; then
        print_success "Web Dockerfile references all required projects"
    else
        print_warning "Web Dockerfile might be missing some project references"
    fi
fi

# Validate MCP Dockerfile
if [ -f "src/NewsPortal.McpServer/Dockerfile" ]; then
    if grep -q "FROM.*AS build" src/NewsPortal.McpServer/Dockerfile; then
        print_success "MCP Dockerfile uses multi-stage build"
    else
        print_warning "MCP Dockerfile might not use multi-stage build"
    fi

    if grep -q "COPY.*NewsPortal.sln" src/NewsPortal.McpServer/Dockerfile; then
        print_success "MCP Dockerfile copies solution file"
    else
        print_error "MCP Dockerfile missing solution file copy"
    fi
fi

# 5. Check .dockerignore
print_section "5. Validating .dockerignore"

if [ -f ".dockerignore" ]; then
    print_success ".dockerignore file exists"

    # Check for common exclusions
    if grep -q "bin/" .dockerignore && grep -q "obj/" .dockerignore; then
        print_success ".dockerignore excludes build artifacts"
    else
        print_warning ".dockerignore might not exclude build artifacts properly"
    fi
else
    print_error ".dockerignore file missing. Build will be slower and larger."
fi

# 6. Check directory structure
print_section "6. Validating Directory Structure"

# Check logs directory will be created
if [ -d "logs" ]; then
    print_success "logs directory exists"
    if [ -w "logs" ]; then
        print_success "logs directory is writable"
    else
        print_error "logs directory is not writable"
    fi
else
    print_info "logs directory will be created during deployment"
fi

# 7. Validate appsettings files
print_section "7. Validating appsettings Files"

if [ -f "src/NewsPortal.Web/appsettings.json" ]; then
    print_success "Web appsettings.json exists"
else
    print_error "Missing src/NewsPortal.Web/appsettings.json"
fi

if [ -f "src/NewsPortal.Web/appsettings.Production.json" ]; then
    print_success "Web appsettings.Production.json exists"
else
    print_warning "Missing src/NewsPortal.Web/appsettings.Production.json (will use defaults)"
fi

if [ -f "src/NewsPortal.McpServer/appsettings.json" ]; then
    print_success "MCP appsettings.json exists"
else
    print_info "MCP appsettings.json not found (might be optional)"
fi

# 8. Check for common issues
print_section "8. Checking for Common Issues"

# Check for Windows line endings (CRLF) in shell scripts
for script in deploy.sh health-check.sh validate-deployment.sh; do
    if [ -f "$script" ]; then
        if file "$script" 2>/dev/null | grep -q "CRLF"; then
            print_warning "$script has Windows line endings (CRLF). Convert to Unix (LF) for Linux."
            print_info "Run: dos2unix $script"
        else
            print_success "$script has correct line endings"
        fi
    fi
done

# Check script permissions
for script in deploy.sh health-check.sh validate-deployment.sh; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_success "$script is executable"
        else
            print_warning "$script is not executable. Run: chmod +x $script"
        fi
    fi
done

# 9. System Requirements Check
print_section "9. Checking System Requirements"

# Check available disk space
available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$available_space" -ge 10 ]; then
    print_success "Sufficient disk space available: ${available_space}GB"
else
    print_warning "Low disk space: ${available_space}GB. Recommended: 20GB+"
fi

# Check available memory (Linux only)
if command -v free &> /dev/null; then
    total_mem=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -ge 4 ]; then
        print_success "Sufficient memory: ${total_mem}GB"
    else
        print_warning "Low memory: ${total_mem}GB. Recommended: 4GB+"
        print_info "Consider enabling swap or reducing container memory limits"
    fi
fi

# 10. Docker Compose Validation
print_section "10. Docker Compose Service Validation"

if docker compose config > /dev/null 2>&1; then
    # Check if all services are defined
    services=$(docker compose config --services 2>/dev/null)

    expected_services=("postgres" "mongodb" "redis" "web" "mcpserver")
    for service in "${expected_services[@]}"; do
        if echo "$services" | grep -q "^$service$"; then
            print_success "Service '$service' is defined"
        else
            print_error "Service '$service' is missing from docker-compose.yml"
        fi
    done

    # Check for volume definitions
    volumes=$(docker compose config --volumes 2>/dev/null)
    if [ -n "$volumes" ]; then
        print_success "Docker volumes are configured"
    else
        print_warning "No Docker volumes defined. Data might not persist."
    fi

    # Check for network definition
    if docker compose config | grep -q "networks:"; then
        print_success "Docker network is configured"
    else
        print_info "Using default Docker network"
    fi
fi

# 11. Build Context Validation
print_section "11. Validating Build Context"

# Check if build context size is reasonable
build_context_size=$(du -sm . 2>/dev/null | cut -f1)
if [ -n "$build_context_size" ]; then
    if [ "$build_context_size" -lt 500 ]; then
        print_success "Build context size is reasonable: ${build_context_size}MB"
    elif [ "$build_context_size" -lt 1000 ]; then
        print_warning "Build context is large: ${build_context_size}MB. Consider improving .dockerignore"
    else
        print_error "Build context is very large: ${build_context_size}MB. This will slow down builds!"
        print_info "Review and update .dockerignore file"
    fi
fi

# 12. Final Summary
print_section "Validation Summary"

echo ""
if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL CHECKS PASSED!                     ║${NC}"
    echo -e "${GREEN}║  Your setup is ready for deployment.      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Run: ./deploy.sh"
    echo "  2. Access: http://your-server-ip:5000"
    echo ""
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠ VALIDATION COMPLETED WITH WARNINGS     ║${NC}"
    echo -e "${YELLOW}║  Warnings: $WARNING_COUNT                              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}You can proceed with deployment, but please review the warnings above.${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ VALIDATION FAILED                       ║${NC}"
    echo -e "${RED}║  Errors: $ERROR_COUNT                                ║${NC}"
    echo -e "${RED}║  Warnings: $WARNING_COUNT                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}Please fix the errors above before deploying.${NC}"
    echo ""
    exit 1
fi
