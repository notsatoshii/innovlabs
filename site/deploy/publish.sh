#!/usr/bin/env bash
# Publish the static site to the DigitalOcean droplet for review.
#
#   ./deploy/publish.sh                 # builds with SITE_URL below, uploads, (re)starts nginx container
#   SITE_URL=https://innovlabs.kr PUBLIC_APP_URL=https://app.innovlabs.kr/start ./deploy/publish.sh
#
# The droplet is shared with the funnel app (Docker, port 3100) and other
# services. The site runs in its own nginx:alpine container on PORT, serving
# /opt/innovlabs-site/dist read-only. Nothing else on the box is touched.
set -euo pipefail

HOST="${HOST:-root@165.245.186.254}"
PORT="${PORT:-8080}"
SITE_URL="${SITE_URL:-http://165.245.186.254:${PORT}}"
# The funnel app (survey) runs on the same droplet, Docker port 3100.
export PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://165.245.186.254:3100/start}"
REMOTE_DIR=/opt/innovlabs-site
NAME=innovlabs-site

cd "$(dirname "$0")/.."

echo "Building for ${SITE_URL}"
npx astro build --site "${SITE_URL}"

echo "Uploading dist/ to ${HOST}:${REMOTE_DIR}"
tar -C dist -czf - . | ssh "${HOST}" "rm -rf ${REMOTE_DIR}/dist && mkdir -p ${REMOTE_DIR}/dist && tar -C ${REMOTE_DIR}/dist -xzf -"

echo "Starting ${NAME} on port ${PORT}"
ssh "${HOST}" "docker rm -f ${NAME} >/dev/null 2>&1 || true; docker run -d --name ${NAME} --restart unless-stopped \
  -p 0.0.0.0:${PORT}:80 \
  -v ${REMOTE_DIR}/dist:/usr/share/nginx/html:ro \
  -v ${REMOTE_DIR}/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine >/dev/null && docker ps --filter name=${NAME} --format '{{.Names}} {{.Status}} {{.Ports}}'"

echo "Live at ${SITE_URL}/ (Korean) and ${SITE_URL}/en/ (English)"
