#!/usr/bin/env bash
# dev-local.sh — run the full stack locally
#
# Postgres runs in a container (Podman preferred, Docker fallback) via container_tool.sh.
# Ollama runs natively (brew install ollama).
#
# Usage:
#   ./scripts/dev-local.sh          # start everything (Postgres in container + API + UI)
#   ./scripts/dev-local.sh --api    # API only (no UI dev server)
#   ./scripts/dev-local.sh --ui     # UI dev server only (API must be running)
#   ./scripts/dev-local.sh --stop   # stop the Postgres container

set -euo pipefail

MODE="${1:-all}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ── Load .env ──────────────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  set -a; source .env; set +a
  echo "[env] Loaded .env"
else
  echo "[env] No .env found — using defaults"
fi

# ── Detect container engine (Podman preferred, Docker fallback) ───────────
CONTAINER_TOOL="$("$ROOT/scripts/container_tool.sh" detect 2>/dev/null || true)"
if [[ -z "$CONTAINER_TOOL" ]]; then
  echo "[container] Neither Podman nor Docker is installed or running."
  echo "            Install Podman: brew install podman && podman machine start"
  exit 1
fi
echo "[container] Using $CONTAINER_TOOL"

# ── Defaults ───────────────────────────────────────────────────────────────
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-agent}"
export DATABASE_URL="${DATABASE_URL:-postgres://agent:${POSTGRES_PASSWORD}@localhost:5433/devworkflow}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:32b-q8_0}"
export KNOWLEDGE_DIR="${KNOWLEDGE_DIR:-$ROOT/pg_seed/eclipse-che}"

CONTAINER_NAME="dev-workflow-postgres-local"

# ── Start Postgres in container (port 5433 to avoid clash with local PG) ──
start_postgres() {
  echo "[postgres] Checking container '$CONTAINER_NAME'..."

  if "$CONTAINER_TOOL" ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[postgres] ✓ Already running"
    return
  fi

  if "$CONTAINER_TOOL" ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[postgres] Restarting stopped container..."
    "$CONTAINER_TOOL" start "$CONTAINER_NAME" > /dev/null
  else
    echo "[postgres] Starting new container (port 5433)..."
    "$ROOT/scripts/container_tool.sh" run -d \
      --name "$CONTAINER_NAME" \
      -e POSTGRES_DB=devworkflow \
      -e POSTGRES_USER=agent \
      -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
      -p 5433:5432 \
      postgres:16-alpine > /dev/null
  fi

  echo "[postgres] Waiting for ready..."
  for i in $(seq 1 20); do
    if "$CONTAINER_TOOL" exec "$CONTAINER_NAME" pg_isready -U agent -d devworkflow &>/dev/null 2>&1; then
      echo "[postgres] ✓ Ready"
      return
    fi
    sleep 1
  done

  echo "[postgres] ✗ Timed out waiting for Postgres"
  "$CONTAINER_TOOL" logs "$CONTAINER_NAME" | tail -20
  exit 1
}

stop_postgres() {
  echo "[postgres] Stopping container '$CONTAINER_NAME'..."
  "$CONTAINER_TOOL" stop "$CONTAINER_NAME" 2>/dev/null && echo "[postgres] Stopped" || echo "[postgres] Was not running"
}

# ── Ensure Ollama is running ───────────────────────────────────────────────
ensure_ollama() {
  # Already reachable (e.g. via Docker or another process)?
  if curl -sf "$OLLAMA_BASE_URL/api/tags" &>/dev/null; then
    echo "[ollama] ✓ Already reachable at $OLLAMA_BASE_URL"
    check_model
    return
  fi

  # Try to start native Ollama if installed
  if command -v ollama &>/dev/null; then
    echo "[ollama] Starting native Ollama..."
    ollama serve &>/tmp/ollama-dev.log &
    sleep 3
    if curl -sf "$OLLAMA_BASE_URL/api/tags" &>/dev/null; then
      echo "[ollama] ✓ Started"
      check_model
      return
    fi
    echo "[ollama] ✗ Failed to start. Log: /tmp/ollama-dev.log"
    exit 1
  fi

  # Not installed — offer to install or skip
  echo ""
  echo "[ollama] ✗ Ollama not installed and not reachable at $OLLAMA_BASE_URL"
  echo ""
  echo "  Option A — Install Ollama (recommended for local use):"
  echo "    brew install ollama"
  echo "    ollama pull $OLLAMA_MODEL"
  echo "    Then re-run this script."
  echo ""
  echo "  Option B — Use Anthropic Claude instead (needs API key):"
  echo "    echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env"
  echo "    Then re-run this script."
  echo ""
  echo "  Option C — Skip Ollama and start API/UI only (for UI testing):"
  echo "    $0 --no-ollama"
  echo ""

  if [[ "${SKIP_OLLAMA:-false}" == "true" ]]; then
    echo "[ollama] Skipped (--no-ollama). Agent calls will fail without a model."
    return
  fi

  exit 1
}

check_model() {
  local tags
  tags=$(curl -sf "$OLLAMA_BASE_URL/api/tags" 2>/dev/null || echo '{"models":[]}')
  if echo "$tags" | python3 -c "
import sys, json
data = json.load(sys.stdin)
models = [m.get('name','') for m in data.get('models',[])]
found = any('$(echo $OLLAMA_MODEL | sed "s/:/:/g")' in m for m in models)
sys.exit(0 if found else 1)
" 2>/dev/null; then
    echo "[ollama] ✓ Model '$OLLAMA_MODEL' ready"
  else
    echo "[ollama] ⚠  Model '$OLLAMA_MODEL' not pulled yet."
    echo "          Run: ollama pull $OLLAMA_MODEL"
    echo "          Or faster test: OLLAMA_MODEL=qwen2.5-coder:7b $0"
    echo "          Continuing — model will be needed when a run starts."
  fi
}

# ── Check AI tool CLIs (optional, enhances agent) ─────────────────────────
check_ai_tools() {
  local found=()
  local missing=()

  command -v claude    &>/dev/null && found+=("claude")    || missing+=("claude (npm install -g @anthropic-ai/claude-code)")
  command -v gemini    &>/dev/null && found+=("gemini")    || missing+=("gemini (npm install -g @google/gemini-cli)")
  command -v opencode  &>/dev/null && found+=("opencode")  || missing+=("opencode (binary download from github.com/anomalyco/opencode)")

  if [[ ${#found[@]} -gt 0 ]]; then
    echo "[ai-tools] Available: ${found[*]}"
  fi
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "[ai-tools] Not found (optional): ${missing[*]}"
    echo "[ai-tools] Install any to enable CLI-based agent execution (faster, more capable than LangGraph)"
  fi
}

# ── Init database from *.md files ─────────────────────────────────────────
run_init() {
  echo "[init] Seeding database from *.md knowledge files..."
  if npx tsx "$ROOT/scripts/init-db.ts" 2>&1 | grep -E "complete|✓|✗|Projects|Issue sources|Context"; then
    echo "[init] ✓ Database ready"
  else
    echo "[init] ⚠ init-db had warnings (non-fatal)"
  fi
}

# ── Cleanup on exit ────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "[shutdown] Stopping API and UI processes..."
  jobs -p | xargs kill 2>/dev/null || true
  wait 2>/dev/null || true
  echo "[shutdown] Postgres container left running (reuse next time). Stop with: $0 --stop"
}
trap cleanup EXIT INT TERM

# ── Main ───────────────────────────────────────────────────────────────────
case "$MODE" in
  --stop)
    stop_postgres
    exit 0
    ;;

  --ui)
    echo "▶ Starting UI dev server only (API must be at :3000)"
    exec yarn dev:ui
    ;;

  --no-ollama)
    export SKIP_OLLAMA=true
    start_postgres
    ensure_ollama
    run_init
    echo "▶ Starting API (port 3000)..."
    yarn dev:api &
    sleep 2
    echo "▶ Starting UI dev server (port 5173)..."
    exec yarn dev:ui
    ;;

  --api)
    start_postgres
    ensure_ollama
    run_init
    echo "▶ Starting API (port 3000)..."
    exec yarn dev:api
    ;;

  *)
    start_postgres
    ensure_ollama
    check_ai_tools
    run_init

    echo "▶ Starting API server (port 3000)..."
    yarn dev:api &
    sleep 2

    echo "▶ Starting UI dev server (port 5173)..."
    yarn dev:ui &

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Agent UI:  http://localhost:5173"
    echo "  API:       http://localhost:3000"
    echo "  Ollama:    $OLLAMA_BASE_URL  ($OLLAMA_MODEL)"
    echo "  Postgres:  localhost:5433 ($CONTAINER_TOOL container: $CONTAINER_NAME)"
    echo ""
    if [[ -z "${GITHUB_TOKEN:-}" ]]; then
      echo "  ⚠  GITHUB_TOKEN not set — dry-run mode"
      echo "     Output written to: ./output/"
      echo ""
    fi
    echo "  Ctrl+C to stop (Postgres stays running for next time)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    wait
    ;;
esac
