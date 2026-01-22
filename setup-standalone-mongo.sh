#!/bin/bash

# News Portal Setup with Standalone MongoDB
# This script sets up MongoDB separately, then runs the rest of the application

set -e

echo "======================================"
echo "News Portal - Standalone MongoDB Setup"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}.env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
        echo ""
        echo -e "${YELLOW}IMPORTANT: Please edit .env file and update the passwords!${NC}"
        nano .env
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

# Start MongoDB separately
echo ""
echo "Starting MongoDB container..."
docker compose -f docker-compose-mongodb.yml up -d
echo -e "${GREEN}✓ MongoDB started${NC}"

# Wait for MongoDB to be ready
echo ""
echo "Waiting for MongoDB to be ready (this may take a few minutes)..."
sleep 60

# Check MongoDB status
MONGO_STATUS=$(docker compose -f docker-compose-mongodb.yml ps mongodb --format "{{.Status}}" | head -n 1)
if [[ $MONGO_STATUS == *"Up"* ]]; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}✗ MongoDB failed to start${NC}"
    docker compose -f docker-compose-mongodb.yml logs mongodb
    exit 1
fi

# Build and start the rest of the application
echo ""
echo "Building and starting the News Portal application..."
docker compose -f docker-compose-no-mongo.yml up -d --build

# Wait for services to be ready
echo ""
echo "Waiting for services to start..."
sleep 60

# Show status
echo ""
echo "Checking service status..."
docker compose -f docker-compose-no-mongo.yml ps

echo ""
echo -e "${GREEN}======================================"
echo "✓ Setup Complete!"
echo "======================================${NC}"
echo ""
echo "Access your application at:"
echo "  http://localhost:5000"
echo ""
echo "MongoDB is running separately and accessible at:"
echo "  localhost:27017"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose-mongodb.yml ps    # Check MongoDB status"
echo "  docker compose -f docker-compose-no-mongo.yml ps   # Check app status"
echo "  docker compose -f docker-compose-no-mongo.yml logs web  # View web logs"
echo ""