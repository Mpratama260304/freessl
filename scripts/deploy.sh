#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

docker compose up -d --build --wait
docker compose --profile tls run --rm certbot
docker compose restart nginx
docker compose exec nginx nginx -t
printf '%s\n' 'Deployment started. Run docker compose ps to inspect health.'