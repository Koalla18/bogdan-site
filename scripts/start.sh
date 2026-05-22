#!/bin/sh

set -eu

MAX_RETRIES="${DB_BOOTSTRAP_MAX_RETRIES:-20}"
SLEEP_SECONDS="${DB_BOOTSTRAP_SLEEP_SECONDS:-3}"

attempt=1
until npm run db:push >/dev/null 2>&1; do
  if [ "$attempt" -ge "$MAX_RETRIES" ]; then
    echo "Database bootstrap failed after ${MAX_RETRIES} attempts."
    exit 1
  fi

  echo "Waiting for PostgreSQL (${attempt}/${MAX_RETRIES})..."
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Database schema is ready. Starting Next.js..."
exec npm run start
