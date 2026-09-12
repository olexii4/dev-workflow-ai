#!/usr/bin/env bash
# scripts/build-pg-seed.sh — build a pre-seeded PostgreSQL dump from pg_seed/ knowledge packs
#
# Spins up a temporary Postgres in Docker, runs migrations + knowledge import,
# dumps the result, then tears the container down.
#
# Output directory: pg_seed_<ISO-8601-UTC>  (colons replaced by underscores)
#   pg_seed_2026-09-08T10_14_00Z/
#   ├── seed.sql    — full schema + data dump  (psql < seed.sql to restore)
#   └── meta.json   — build metadata
#
# Usage:
#   ./scripts/build-pg-seed.sh
#   ./scripts/build-pg-seed.sh --knowledge pg_seed/eclipse-che  --out .
#
# Options:
#   --knowledge <dir>   knowledge pack directory to import (default: pg_seed/eclipse-che)
#   --out <dir>         parent directory for the output (default: repo root)
#
# Prerequisites:
#   docker    (to run the temporary Postgres)
#   node/npx  (to run migrations and knowledge import)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

KNOWLEDGE_DIR="${KNOWLEDGE_DIR:-$ROOT/pg_seed/eclipse-che}"
OUT_PARENT="$ROOT"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --knowledge) KNOWLEDGE_DIR="$2"; shift 2 ;;
    --out)       OUT_PARENT="$2";    shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Timestamp: ISO 8601 UTC, colons → underscores ─────────────────────────────
TS=$(date -u '+%Y-%m-%dT%H_%M_%SZ')
SEED_DIR="$OUT_PARENT/pg_seed_${TS}"

# ── Temp Postgres config ───────────────────────────────────────────────────────
CONTAINER="dwa-pg-seed-$$"
DB_PORT=5499   # deliberately off-standard to avoid clashing with local postgres
DB_NAME="devworkflow"
DB_USER="agent"
DB_PASS="agent"
DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}"

trap "echo '→ Cleaning up...'; docker rm -f '$CONTAINER' &>/dev/null || true" EXIT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  build-pg-seed — building PostgreSQL seed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Knowledge: $KNOWLEDGE_DIR"
echo "  Output:    $SEED_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Start temporary Postgres ───────────────────────────────────────────────
echo "→ Starting temporary Postgres (port $DB_PORT)..."
docker run -d --name "$CONTAINER" \
  -p "${DB_PORT}:5432" \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASS" \
  postgres:16-alpine >/dev/null

# Wait for ready
echo -n "  Waiting for Postgres"
for i in {1..30}; do
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" &>/dev/null; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo ""
    echo "ERROR: Postgres did not become ready in 30s"
    exit 1
  fi
done

# ── 2. Migrations + knowledge import ─────────────────────────────────────────
echo "→ Running migrations + importing knowledge..."
cd "$ROOT"
DATABASE_URL="$DATABASE_URL" \
KNOWLEDGE_DIR="$KNOWLEDGE_DIR" \
  npx tsx scripts/init-db.ts 2>&1 \
  | grep -E '✓|✗|Error|projects|files|sources|Done|Context|knowledge' || true
echo "  ✓ Import complete"

# ── 3. Dump ───────────────────────────────────────────────────────────────────
echo "→ Dumping schema + data..."
mkdir -p "$SEED_DIR"

docker exec "$CONTAINER" \
  pg_dump -U "$DB_USER" --no-owner --no-acl "$DB_NAME" \
  > "$SEED_DIR/seed.sql"

SEED_LINES=$(wc -l < "$SEED_DIR/seed.sql" | tr -d ' ')
SEED_SIZE=$(du -sh "$SEED_DIR/seed.sql" | cut -f1)

# ── 4. Meta ───────────────────────────────────────────────────────────────────
MD_COUNT=$(find "$KNOWLEDGE_DIR" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
PG_VERSION=$(docker exec "$CONTAINER" psql -U "$DB_USER" -tAc "SELECT version();" 2>/dev/null | head -1 || echo "unknown")

python3 - <<PYEOF > "$SEED_DIR/meta.json"
import json, datetime
print(json.dumps({
  "built_at":         "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_dir":       "pg_seed/eclipse-che",
  "knowledge_files":  int("$MD_COUNT"),
  "db_name":          "$DB_NAME",
  "db_user":          "$DB_USER",
  "postgres_version": "$PG_VERSION".split(",")[0].strip(),
  "seed_lines":       int("$SEED_LINES"),
  "seed_size":        "$SEED_SIZE",
}, indent=2))
PYEOF

# ── 5. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Seed ready: pg_seed_${TS}/"
echo "  Size: $SEED_SIZE  ($SEED_LINES lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Restore locally:"
echo "    psql $DATABASE_URL < $SEED_DIR/seed.sql"
echo ""
echo "  Mount into Docker postgres init:"
echo "    docker run ... -v $SEED_DIR/seed.sql:/docker-entrypoint-initdb.d/01-seed.sql postgres:16-alpine"
echo ""
echo "  Use in devfile (one-time restore instead of init-db.ts):"
echo "    psql \$DATABASE_URL < \${PROJECT_SOURCE}/pg_seed_${TS}/seed.sql"
echo ""
