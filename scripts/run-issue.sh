#!/usr/bin/env bash
# run-issue.sh — start the agent on a GitHub issue
#
# Usage:
#   ./scripts/run-issue.sh https://github.com/eclipse-che/che/issues/20670
#   ./scripts/run-issue.sh https://github.com/eclipse-che/che/issues/20670 --force-priority
#   ./scripts/run-issue.sh https://github.com/eclipse-che/che/issues/20670 --project che-dashboard
#
# Without GITHUB_TOKEN: writes PR description + patch to ./output/ (dry-run)
# With    GITHUB_TOKEN: pushes branch and creates a real GitHub PR

set -euo pipefail

ISSUE_URL="${1:-}"
FORCE_PRIORITY=false
PROJECT_OVERRIDE=""
API_URL="${API_URL:-http://localhost:3000}"

if [[ -z "$ISSUE_URL" ]]; then
  echo "Usage: $0 <github-issue-url> [--force-priority] [--project <slug>]"
  echo "Example: $0 https://github.com/eclipse-che/che/issues/20670"
  exit 1
fi

# Parse extra flags
shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-priority) FORCE_PRIORITY=true ;;
    --project)        PROJECT_OVERRIDE="$2"; shift ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
  shift
done

# Detect dry-run mode
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "⚠  GITHUB_TOKEN not set — running in dry-run mode."
  echo "   Output will be written to ./output/"
  DRY_RUN_MSG=" (dry-run)"
else
  DRY_RUN_MSG=""
fi

echo "▶ Starting agent${DRY_RUN_MSG} on: $ISSUE_URL"

# Build JSON body
BODY=$(jq -n \
  --arg url  "$ISSUE_URL" \
  --arg proj "$PROJECT_OVERRIDE" \
  --argjson force "$FORCE_PRIORITY" \
  '{issueUrl: $url, forcePriority: $force} + (if $proj != "" then {project: $proj} else {} end)')

# Try the API first (when docker compose is running)
if curl -sf "$API_URL/api/runs" -o /dev/null 2>/dev/null; then
  echo "   API at $API_URL is up — posting run..."
  RESPONSE=$(curl -s -X POST "$API_URL/api/runs" \
    -H "Content-Type: application/json" \
    -d "$BODY")

  THREAD_ID=$(echo "$RESPONSE" | jq -r '.threadId // empty')
  IS_DRY=$(echo "$RESPONSE" | jq -r '.dryRun // false')

  if [[ -z "$THREAD_ID" ]]; then
    echo "✗ Failed to start run. API response:"
    echo "$RESPONSE"
    exit 1
  fi

  echo ""
  echo "✓ Run started!"
  echo "  Thread:   $THREAD_ID"
  if [[ "$IS_DRY" == "true" ]]; then
    echo "  Mode:     dry-run (output → ./output/)"
  fi
  echo ""
  echo "  Watch:    $API_URL → Dashboard"
  echo ""
  echo "  Stream logs:"
  echo "    curl -sN '$API_URL/api/runs/$THREAD_ID' | jq ."

else
  # Fallback: run directly with tsx (no API server needed)
  echo "   API not reachable — running directly with tsx..."
  echo ""

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  ROOT="$(dirname "$SCRIPT_DIR")"

  exec npx tsx "$ROOT/scripts/run-issue-direct.ts" "$ISSUE_URL" \
    --force-priority="$FORCE_PRIORITY" \
    ${PROJECT_OVERRIDE:+--project="$PROJECT_OVERRIDE"}
fi
