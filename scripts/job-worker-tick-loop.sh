#!/usr/bin/env bash
set -euo pipefail

cd /opt/enaunity
set -a
# shellcheck disable=SC1091
source .env.production
set +a

URL="${JOB_WORKER_CRON_URL:-http://127.0.0.1:3333/api/cron/job-worker}"
INTERVAL="${JOB_WORKER_CRON_INTERVAL_SEC:-8}"

while true; do
  curl -sf -m 25 -H "x-cron-secret: ${CRON_SECRET}" -X POST "$URL" >/dev/null 2>&1 || true
  sleep "$INTERVAL"
done
