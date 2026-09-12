#!/usr/bin/env bash
# scripts/test-local.sh — test the custom LangGraph agent locally
#
# One-command smoke test: seeds DB, runs agent on a real issue, shows output.
# Works without Docker, Ollama, or a GitHub token.
#
# Usage:
#   ./scripts/test-local.sh
#   ./scripts/test-local.sh https://github.com/eclipse-che/che/issues/20670
#   GEMINI_API_KEY=<key> ./scripts/test-local.sh
#
# What it does:
#   1. Starts Postgres if not running (docker, Colima socket)
#   2. Seeds DB from pg_seed/eclipse-che/*.md
#   3. Runs the custom agent in dry-run mode on the target issue
#   4. Prints output files (analysis.md, pr-description.md, changes.patch)
#
# LLM selection (in priority order):
#   ANTHROPIC_API_KEY → Claude (best)
#   GEMINI_API_KEY    → Gemini (GEMINI_MODEL=gemini-3.6-flash)
#   OLLAMA_MODEL      → local Ollama (needs model pulled)
#   (none)            → stub mode — template output, no LLM needed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

ISSUE_URL="${1:-https://github.com/eclipse-che/che/issues/20670}"
OUTPUT_DIR="output"

# ── Load .env if present ────────────────────────────────────────────────────

[[ -f "$ROOT/.env" ]] && { set -a; source "$ROOT/.env"; set +a; echo "[env] Loaded .env"; }

export DATABASE_URL="${DATABASE_URL:-postgres://agent:agent@localhost:5433/devworkflow}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:32b-q8_0}"
export KNOWLEDGE_DIR="${KNOWLEDGE_DIR:-$ROOT/pg_seed/eclipse-che}"
export GEMINI_MODEL="${GEMINI_MODEL:-gemini-3.6-flash}"

# ── Detect available LLM ────────────────────────────────────────────────────

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  LLM="Claude"
  STUB=false
elif [[ -n "${GEMINI_API_KEY:-}" ]]; then
  LLM="Gemini $GEMINI_MODEL"
  STUB=false
elif curl -sf "$OLLAMA_BASE_URL/api/tags" &>/dev/null; then
  # Check the specific model is actually pulled
  if curl -sf "$OLLAMA_BASE_URL/api/tags" \
       | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if any('$OLLAMA_MODEL' in m.get('name','') for m in d.get('models',[])) else 1)" 2>/dev/null; then
    LLM="Ollama $OLLAMA_MODEL"
    STUB=false
  else
    # Model not pulled — show available models and fall back to stub
    AVAILABLE=$(curl -sf "$OLLAMA_BASE_URL/api/tags" \
      | python3 -c "import sys,json; d=json.load(sys.stdin); print(', '.join(m['name'] for m in d.get('models',[])) or 'none')" 2>/dev/null)
    echo "[llm] ⚠  Model '$OLLAMA_MODEL' not pulled."
    echo "       Available: ${AVAILABLE:-none}"
    echo "       Pull: ollama pull $OLLAMA_MODEL"
    if [[ -n "$AVAILABLE" && "$AVAILABLE" != "none" ]]; then
      # Use first available model instead
      FIRST_MODEL=$(curl -sf "$OLLAMA_BASE_URL/api/tags" \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['models'][0]['name'])" 2>/dev/null)
      export OLLAMA_MODEL="$FIRST_MODEL"
      LLM="Ollama $OLLAMA_MODEL (auto-selected)"
      STUB=false
      echo "       Auto-selecting: $OLLAMA_MODEL"
    else
      LLM="stub (Ollama has no models pulled)"
      STUB=true
    fi
  fi
else
  LLM="stub (no LLM — template output)"
  STUB=true
fi

# ── Banner ──────────────────────────────────────────────────────────────────

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  dev-workflow-ai — local agent test                      │"
echo "├─────────────────────────────────────────────────────────┤"
printf "│  Issue: %-49s│\n" "$ISSUE_URL"
printf "│  LLM:   %-49s│\n" "$LLM"
printf "│  Mode:  %-49s│\n" "DRY-RUN (no push) → output/$( echo "$ISSUE_URL" | grep -oE '[^/]+/[^/]+/issues/[0-9]+' | tr '/' '-' | sed 's/issues-//')"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# ── Ensure Postgres ─────────────────────────────────────────────────────────

DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@||; s|/.*||; s|:.*||')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*@||; s|/.*||' | grep -oE ':[0-9]+' | tr -d ':')
DB_PORT="${DB_PORT:-5432}"

DOCKER_SOCK="${DOCKER_HOST:-unix://$HOME/.colima/default/docker.sock}"

if nc -z "$DB_HOST" "$DB_PORT" &>/dev/null 2>&1; then
  echo "[db] PostgreSQL ✓ ($DB_HOST:$DB_PORT)"
else
  echo "[db] Starting Postgres..."
  DOCKER_HOST="$DOCKER_SOCK" docker run -d \
    --name dwa-test-postgres \
    -p "${DB_PORT}:5432" \
    -e POSTGRES_DB=devworkflow \
    -e POSTGRES_USER=agent \
    -e POSTGRES_PASSWORD=agent \
    postgres:16-alpine &>/dev/null 2>&1 || true
  sleep 3
  nc -z "$DB_HOST" "$DB_PORT" &>/dev/null 2>&1 && echo "[db] ✓ started" \
    || { echo "[db] ✗ cannot start Postgres. Start manually: docker run -d -p 5433:5432 -e POSTGRES_DB=devworkflow -e POSTGRES_USER=agent -e POSTGRES_PASSWORD=agent postgres:16-alpine"; exit 1; }
fi

# ── Seed knowledge ──────────────────────────────────────────────────────────

echo "[db] Seeding knowledge from pg_seed/eclipse-che..."
DATABASE_URL="$DATABASE_URL" KNOWLEDGE_DIR="$KNOWLEDGE_DIR" \
  npx tsx "$ROOT/scripts/init-db.ts" --skip-preview 2>&1 \
  | grep -E "✓|Context files|Projects|Issue sources|Error" | head -5

# ── Run agent ───────────────────────────────────────────────────────────────

echo ""
echo "[agent] Running..."
echo ""

if [[ "$STUB" == "true" ]]; then
  DATABASE_URL="" \
  npx tsx "$ROOT/scripts/run-issue-stub.ts" \
    "$ISSUE_URL" \
    --output="$OUTPUT_DIR" \
    --samples="$KNOWLEDGE_DIR"
else
  DATABASE_URL="$DATABASE_URL" \
  OLLAMA_BASE_URL="$OLLAMA_BASE_URL" \
  OLLAMA_MODEL="$OLLAMA_MODEL" \
  KNOWLEDGE_DIR="$KNOWLEDGE_DIR" \
  npx tsx "$ROOT/scripts/run-issue-direct.ts" \
    "$ISSUE_URL" \
    --force-priority=true \
    --output="$OUTPUT_DIR"
fi

# ── Show output ─────────────────────────────────────────────────────────────

ISSUE_SLUG=$(echo "$ISSUE_URL" | grep -oE 'github\.com/([^/]+)/([^/]+)/issues/([0-9]+)' \
  | sed 's|github.com/||; s|/issues/|-|; s|/|-|')
OUT_DIR="$ROOT/$OUTPUT_DIR/$ISSUE_SLUG"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  Output                                                   │"
echo "└─────────────────────────────────────────────────────────┘"

if [[ -d "$OUT_DIR" ]]; then
  ls -lh "$OUT_DIR" 2>/dev/null
  echo ""
  for f in analysis.md pr-description.md; do
    [[ -f "$OUT_DIR/$f" ]] && { echo "── $f ──────────────────────────"; cat "$OUT_DIR/$f"; echo ""; }
  done
  if [[ -f "$OUT_DIR/changes.patch" ]]; then
    LINES=$(wc -l < "$OUT_DIR/changes.patch")
    echo "── changes.patch ($LINES lines) ───────────────────────"
    head -40 "$OUT_DIR/changes.patch"
    [[ "$LINES" -gt 40 ]] && echo "... ($(( LINES - 40 )) more lines in $OUT_DIR/changes.patch)"
  fi
else
  echo "No output — agent may have been skipped (check for priority/lifecycle/frozen labels)"
  echo "Re-run with --force-priority to bypass."
fi
