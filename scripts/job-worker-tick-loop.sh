#!/usr/bin/env bash
set -euo pipefail

cd /opt/enaunity
set -a
# shellcheck disable=SC1091
source .env.production
set +a

URL="${JOB_WORKER_CRON_URL:-http://127.0.0.1:3333/api/cron/job-worker}"
INTERVAL="${JOB_WORKER_CRON_INTERVAL_SEC:-8}"
THYRONIX_SYNC_URL="${THYRONIX_SYNC_CRON_URL:-http://127.0.0.1:3333/api/cron/thyronix-sync}"
THYRONIX_SYNC_INTERVAL="${THYRONIX_SYNC_CRON_INTERVAL_SEC:-1800}"
XML_FEED_SYNC_URL="${XML_FEED_SYNC_CRON_URL:-http://127.0.0.1:3333/api/cron/xml-feed-sync}"
XML_FEED_SYNC_INTERVAL="${XML_FEED_SYNC_CRON_INTERVAL_SEC:-43200}"
LAST_THYRONIX_SYNC=0
LAST_XML_FEED_SYNC=0

while true; do
  curl -sf -m 25 -H "x-cron-secret: ${CRON_SECRET}" -X POST "$URL" >/dev/null 2>&1 || true
  NOW="$(date +%s)"
  if (( NOW - LAST_THYRONIX_SYNC >= THYRONIX_SYNC_INTERVAL )); then
    curl -sf -m 300 -H "x-cron-secret: ${CRON_SECRET}" -X POST "$THYRONIX_SYNC_URL" >/dev/null 2>&1 || true
    LAST_THYRONIX_SYNC="$NOW"
  fi
  if (( NOW - LAST_XML_FEED_SYNC >= XML_FEED_SYNC_INTERVAL )); then
    curl -sf -m 600 -H "x-cron-secret: ${CRON_SECRET}" -X POST "$XML_FEED_SYNC_URL" >/dev/null 2>&1 || true
    LAST_XML_FEED_SYNC="$NOW"
  fi
  sleep "$INTERVAL"
done
