#!/bin/bash

# News Portal - Health Check Script
# Checks the status of all services and displays health information

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================"
echo "News Portal - Health Check"
echo "======================================${NC}"
echo ""

# Check if docker-compose is running
if ! docker compose ps > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker Compose is not available or no containers are running${NC}"
    exit 1
fi

# Function to check service health
check_service() {
    local service=$1
    local container=$2

    status=$(docker compose ps $service --format json 2>/dev/null | jq -r '.[0].Health // .[0].State' 2>/dev/null)

    if [ -z "$status" ]; then
        echo -e "${service}: ${RED}NOT RUNNING${NC}"
        return 1
    fi

    case $status in
        "healthy"|"running")
            echo -e "${service}: ${GREEN}✓ HEALTHY${NC}"
            return 0
            ;;
        "starting")
            echo -e "${service}: ${YELLOW}⏳ STARTING${NC}"
            return 2
            ;;
        *)
            echo -e "${service}: ${RED}✗ UNHEALTHY${NC}"
            return 1
            ;;
    esac
}

# Check all services
echo "Service Status:"
echo "----------------------------------------"
check_service "postgres" "newsportal-db"
pg_status=$?

check_service "mongodb" "newsportal-mongodb"
mongo_status=$?

check_service "redis" "newsportal-cache"
redis_status=$?

check_service "seq" "newsportal-seq"
seq_status=$?

check_service "web" "newsportal-web-client"
web_status=$?

check_service "api" "newsportal-api"
api_status=$?

check_service "mcpserver" "newsportal-mcp"
mcp_status=$?

echo ""
echo "----------------------------------------"

# Overall status
if [ $pg_status -eq 0 ] && [ $mongo_status -eq 0 ] && [ $redis_status -eq 0 ] && [ $seq_status -eq 0 ] && [ $web_status -eq 0 ] && [ $api_status -eq 0 ] && [ $mcp_status -eq 0 ]; then
    echo -e "${GREEN}Overall Status: ✓ ALL SERVICES HEALTHY${NC}"
    health_ok=true
else
    echo -e "${RED}Overall Status: ✗ SOME SERVICES UNHEALTHY${NC}"
    health_ok=false
fi

echo ""

# Resource usage
echo "Resource Usage:"
echo "----------------------------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep newsportal

echo ""
echo "----------------------------------------"

# Disk usage
echo ""
echo "Volume Usage:"
echo "----------------------------------------"
docker volume ls --filter name=newsportal --format "table {{.Name}}\t{{.Driver}}"

echo ""

# Network check
echo "Network Connectivity:"
echo "----------------------------------------"

# Check if web application is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5000 | grep -q "200\|302\|301"; then
    echo -e "Web Application (HTTP): ${GREEN}✓ RESPONDING${NC}"
else
    echo -e "Web Application (HTTP): ${RED}✗ NOT RESPONDING${NC}"
fi

# Check PostgreSQL
if docker exec newsportal-db pg_isready -U newsadmin > /dev/null 2>&1; then
    echo -e "PostgreSQL Database: ${GREEN}✓ ACCEPTING CONNECTIONS${NC}"
else
    echo -e "PostgreSQL Database: ${RED}✗ NOT ACCEPTING CONNECTIONS${NC}"
fi

# Check Redis
if docker exec newsportal-cache redis-cli ping > /dev/null 2>&1; then
    echo -e "Redis Cache: ${GREEN}✓ RESPONDING${NC}"
else
    echo -e "Redis Cache: ${RED}✗ NOT RESPONDING${NC}"
fi

# Check MongoDB
if docker exec newsportal-mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "MongoDB: ${GREEN}✓ RESPONDING${NC}"
else
    echo -e "MongoDB: ${RED}✗ NOT RESPONDING${NC}"
fi

# Check Seq
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q "200\|302\|301"; then
    echo -e "Seq Logging (HTTP): ${GREEN}✓ RESPONDING${NC}"
else
    echo -e "Seq Logging (HTTP): ${RED}✗ NOT RESPONDING${NC}"
fi

echo ""
echo "----------------------------------------"

# Log summary
echo ""
echo "Recent Errors (last 50 lines):"
echo "----------------------------------------"
error_count=$(docker compose logs --tail=50 2>&1 | grep -i "error\|exception\|fatal" | wc -l)

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}No recent errors found${NC}"
else
    echo -e "${YELLOW}Found $error_count error lines in recent logs${NC}"
    echo "Run 'docker compose logs -f' to view details"
fi

echo ""
echo "======================================"

# Exit code based on health
if [ "$health_ok" = true ]; then
    exit 0
else
    exit 1
fi
