#!/usr/bin/env bash
# workspace-entrypoint.sh — start postgres, then exec the main container command.
#
# Runs as the UDI default user (UID 10001 or OpenShift-assigned UID).
# Postgres is started in the background before the main process (usually
# "tail -f /dev/null" for interactive devfile workspaces).

set -euo pipefail

echo "[workspace] Starting postgres background service..."
/usr/local/bin/start-postgres.sh

echo "[workspace] Postgres ready. Starting main process: $*"
exec "$@"
