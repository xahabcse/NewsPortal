#!/bin/bash

# ==============================================================================
# NewsPortal — Rollback Script
# ==============================================================================
# Rolls back the production deployment to a previous image tag.
#
# Usage:
#   ./script/rollback.sh <image-tag>    # Roll back to specific git SHA tag
#   ./script/rollback.sh previous       # Roll back to the previously deployed tag
#
# Example:
#   ./script/rollback.sh abc1234
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env"
HISTORY_FILE="${ROOT_DIR}/.deploy-history"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
print_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ---------- Validation ----------
if [ $# -lt 1 ]; then
    echo "Usage: $0 <image-tag|previous>"
    echo ""
    echo "  <image-tag>  Git SHA short tag (e.g., abc1234)"
    echo "  previous     Roll back to the previously deployed tag"
    echo ""
    if [ -f "${HISTORY_FILE}" ]; then
        echo "Recent deployments:"
        tail -5 "${HISTORY_FILE}"
    fi
    exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
    print_error ".env file not found at ${ENV_FILE}"
    exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
    print_error "docker-compose.prod.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

TARGET_TAG="$1"

# ---------- Resolve "previous" ----------
if [ "${TARGET_TAG}" = "previous" ]; then
    if [ ! -f "${HISTORY_FILE}" ] || [ $(wc -l < "${HISTORY_FILE}") -lt 2 ]; then
        print_error "No previous deployment found in ${HISTORY_FILE}"
        exit 1
    fi
    TARGET_TAG=$(tail -2 "${HISTORY_FILE}" | head -1 | awk '{print $1}')
    print_info "Resolved 'previous' to tag: ${TARGET_TAG}"
fi

# ---------- Save current tag ----------
CURRENT_TAG=$(grep '^IMAGE_TAG=' "${ENV_FILE}" | cut -d'=' -f2 || echo "unknown")
print_info "Current IMAGE_TAG: ${CURRENT_TAG}"
print_info "Rolling back to:   ${TARGET_TAG}"
echo ""

read -r -p "Proceed with rollback? (y/N) " confirm
if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
    print_info "Rollback cancelled."
    exit 0
fi

# ---------- Update IMAGE_TAG in .env ----------
if grep -q '^IMAGE_TAG=' "${ENV_FILE}"; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TARGET_TAG}/" "${ENV_FILE}"
else
    echo "IMAGE_TAG=${TARGET_TAG}" >> "${ENV_FILE}"
fi
print_ok "Updated IMAGE_TAG to ${TARGET_TAG} in .env"

# ---------- Pull & Restart ----------
print_info "Pulling images with tag ${TARGET_TAG}..."
docker compose -f "${COMPOSE_FILE}" pull

print_info "Restarting containers..."
docker compose -f "${COMPOSE_FILE}" up -d

# ---------- Health Check ----------
print_info "Waiting 30 seconds for services to start..."
sleep 30

HEALTH_OK=true

# Check web health
if curl -sf http://localhost:80/healthz > /dev/null 2>&1; then
    print_ok "Web health check passed."
else
    print_error "Web health check failed!"
    HEALTH_OK=false
fi

# Check container states
UNHEALTHY=$(docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep -c "unhealthy" || true)
if [ "${UNHEALTHY}" -gt 0 ]; then
    print_error "${UNHEALTHY} unhealthy container(s) detected."
    HEALTH_OK=false
fi

if [ "${HEALTH_OK}" = true ]; then
    print_ok "Rollback to ${TARGET_TAG} completed successfully!"
    # Record deployment
    echo "${TARGET_TAG} $(date '+%Y-%m-%d %H:%M:%S') rollback-from-${CURRENT_TAG}" >> "${HISTORY_FILE}"
else
    print_error "Rollback health checks failed. Attempting to restore previous tag..."
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${CURRENT_TAG}/" "${ENV_FILE}"
    docker compose -f "${COMPOSE_FILE}" pull
    docker compose -f "${COMPOSE_FILE}" up -d
    print_warn "Restored IMAGE_TAG to ${CURRENT_TAG}. Please investigate manually."
    exit 1
fi

# ---------- Summary ----------
echo ""
print_info "Container Status:"
docker compose -f "${COMPOSE_FILE}" ps --format "table {{.Name}}\t{{.Status}}"
