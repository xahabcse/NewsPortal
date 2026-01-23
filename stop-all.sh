#!/bin/bash

# Stop all News Portal services

echo "Stopping News Portal services..."

# Stop the main application
docker compose down

echo "All services stopped."