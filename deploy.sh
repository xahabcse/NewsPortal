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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Please do not run as root${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"
echo -e "${GREEN}✓ Docker Compose is installed${NC}"
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
echo ""
echo "Creating log directories..."
mkdir -p logs/web logs/mcp
chmod -R 755 logs
echo -e "${GREEN}✓ Log directories created${NC}"

# Ask deployment type
echo ""
echo "Select deployment option:"
echo "1) Fresh deployment (pull images, build, start)"
echo "2) Update deployment (rebuild and restart)"
echo "3) Start existing containers"
echo "4) Stop all containers"
echo "5) Stop and remove all (including data volumes)"
echo ""
read -p "Enter option (1-5): " option

case $option in
    1)
        echo ""
        echo "Starting fresh deployment..."
        echo ""
        # Only pull external images (databases), skip local app images
        docker compose pull postgres mongodb redis
        docker compose up -d --build
        ;;
    2)
        echo ""
        echo "Updating deployment..."
        echo ""
        docker compose build
        docker compose up -d
        ;;
    3)
        echo ""
        echo "Starting containers..."
        echo ""
        docker compose up -d
        ;;
    4)
        echo ""
        echo "Stopping containers..."
        echo ""
        docker compose down
        echo -e "${GREEN}✓ All containers stopped${NC}"
        exit 0
        ;;
    5)
        echo ""
        echo -e "${RED}WARNING: This will remove all data including databases!${NC}"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            docker compose down -v
            echo -e "${GREEN}✓ All containers and volumes removed${NC}"
        else
            echo "Cancelled"
        fi
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Wait for services to be healthy
echo ""
echo "Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "Checking service status..."
docker compose ps

# Check if web service is running
if docker compose ps web | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}======================================"
    echo "✓ Deployment Successful!"
    echo "======================================${NC}"
    echo ""
    echo "Access your application at:"
    echo "  http://localhost:5000"
    echo ""
    echo "Or from another machine:"
    echo "  http://$(hostname -I | awk '{print $1}'):5000"
    echo ""
    echo "Useful commands:"
    echo "  docker compose logs -f          # View all logs"
    echo "  docker compose logs -f web      # View web logs"
    echo "  docker compose ps               # Check status"
    echo "  docker compose restart          # Restart all"
    echo "  docker compose down             # Stop all"
    echo ""
    echo "For more information, see DEPLOYMENT.md"
    echo ""
else
    echo ""
    echo -e "${RED}Deployment failed. Check logs:${NC}"
    echo "  docker compose logs"
    echo ""
fi
