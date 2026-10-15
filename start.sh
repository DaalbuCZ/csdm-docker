#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo ".env not found, copying .env.example — edit it before exposing this server."
  cp .env.example .env
fi

docker compose -f docker-compose.yml -p csdm up -d --build
docker compose -f docker-compose.yml -p csdm ps
