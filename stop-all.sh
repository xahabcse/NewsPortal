#!/bin/bash

# Stop all News Portal services

echo "Stopping News Portal services..."

# Stop the main application
echo "Stopping main application..."
docker compose -f docker-compose-no-mongo.yml down

# Stop MongoDB
echo "Stopping MongoDB..."
docker compose -f docker-compose-mongodb.yml down

echo "All services stopped."