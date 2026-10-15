#!/bin/bash
set -e

# ==========================================================
# qa-init.sh — Initialize directory structure & composable fixtures for QA test artifacts.
# Usage:
#   bash qa-init.sh <issueKey> [--type=api,ws,web_ui,mobile] [workspace-root]
#
# Examples:
#   bash qa-init.sh STK-101 --type=api
#   bash qa-init.sh G3PTP-16825 --type=api,ws
#   bash qa-init.sh G3PTP-17000 --type=all workspace/issues
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_DESIGN_ASSETS="$(cd "$SCRIPT_DIR/../../qa-auto-design/assets" 2>/dev/null && pwd || true)"
if [ -z "$AUTO_DESIGN_ASSETS" ] || [ ! -d "$AUTO_DESIGN_ASSETS" ]; then
  if [ -n "$AGENT_SKILLS_HOME" ] && [ -d "$AGENT_SKILLS_HOME/plugins/qa/skills/qa-auto-design/assets" ]; then
    AUTO_DESIGN_ASSETS="$AGENT_SKILLS_HOME/plugins/qa/skills/qa-auto-design/assets"
  fi
fi

ISSUE_KEY_RAW=""
WORKSPACE_ROOT=""
TASK_TYPES="api"

# Parse arguments (supports positional args and flags in any order)
for arg in "$@"; do
  case "$arg" in
    --type=*)
      TASK_TYPES="${arg#*=}"
      ;;
    --profile=*)
      TASK_TYPES="${arg#*=}"
      ;;
    -h|--help)
      echo "Usage: qa-init.sh <issueKey> [--type=api,ws,web_ui,mobile,all] [workspace-root]"
      exit 0
      ;;
    *)
      if [ -z "$ISSUE_KEY_RAW" ]; then
        ISSUE_KEY_RAW="$arg"
      elif [ -z "$WORKSPACE_ROOT" ]; then
        WORKSPACE_ROOT="$arg"
      fi
      ;;
  esac
done

if [ -z "$ISSUE_KEY_RAW" ]; then
  echo "Usage: qa-init.sh <issueKey> [--type=api,ws,web_ui,mobile,all] [workspace-root]" >&2
  exit 1
fi

# Normalize issue key to upper case for consistent directory naming
ISSUE_KEY=$(echo "$ISSUE_KEY_RAW" | tr '[:lower:]' '[:upper:]')

# Auto-detect default workspace root
if [ -z "$WORKSPACE_ROOT" ]; then
  if [ -d "workspace/issues" ]; then
    WORKSPACE_ROOT="workspace/issues"
  else
    WORKSPACE_ROOT="workspace"
  fi
fi

OUTPUT_DIR="${WORKSPACE_ROOT}/${ISSUE_KEY}/test"

# Create standardized directory structure
mkdir -p "$OUTPUT_DIR/fixtures"
mkdir -p "$OUTPUT_DIR/steps"
mkdir -p "$OUTPUT_DIR/result"
touch "$OUTPUT_DIR/fixtures/__init__.py"

COPIED_FIXTURES=()

# 1. Copy conftest_core.py as invariant conftest.py
if [ -d "$AUTO_DESIGN_ASSETS" ] && [ -f "$AUTO_DESIGN_ASSETS/conftest_core.py" ]; then
  if [ ! -f "$OUTPUT_DIR/conftest.py" ]; then
    cp "$AUTO_DESIGN_ASSETS/conftest_core.py" "$OUTPUT_DIR/conftest.py"
    COPIED_FIXTURES+=("conftest.py (from conftest_core.py)")
  fi
fi

# 2. Parse TASK_TYPES (comma-separated, case-insensitive)
TYPES_LOWER=$(echo "$TASK_TYPES" | tr '[:upper:]' '[:lower:]')
IFS=',' read -ra ADDR <<< "$TYPES_LOWER"

copy_fixture_if_exists() {
  local src_name="$1"
  local dest_name="$2"
  if [ -d "$AUTO_DESIGN_ASSETS" ] && [ -f "$AUTO_DESIGN_ASSETS/$src_name" ]; then
    cp "$AUTO_DESIGN_ASSETS/$src_name" "$OUTPUT_DIR/fixtures/$dest_name"
    COPIED_FIXTURES+=("fixtures/$dest_name")
  fi
}

HAS_ALL=false
HAS_API=false
HAS_WS=false
HAS_UI=false
HAS_MOBILE=false

for item in "${ADDR[@]}"; do
  trimmed=$(echo "$item" | xargs)
  case "$trimmed" in
    all)
      HAS_ALL=true
      ;;
    api|qa-profile-api|rest|state|data|qa-profile-state|qa-profile-data)
      HAS_API=true
      ;;
    ws|websocket|qa-profile-ws|streaming|mdds)
      HAS_WS=true
      ;;
    ui|web|web_ui|web-ui|qa-profile-ui|playwright)
      HAS_UI=true
      ;;
    mobile|app|appium|qa-profile-mobile)
      HAS_MOBILE=true
      ;;
  esac
done

if [ "$HAS_ALL" = true ]; then
  copy_fixture_if_exists "fixtures_api.py" "fixtures_api.py"
  copy_fixture_if_exists "fixtures_ws.py" "fixtures_ws.py"
  copy_fixture_if_exists "fixtures_web_ui.py" "fixtures_web_ui.py"
  copy_fixture_if_exists "fixtures_mobile.py" "fixtures_mobile.py"
else
  if [ "$HAS_API" = true ]; then
    copy_fixture_if_exists "fixtures_api.py" "fixtures_api.py"
  fi
  if [ "$HAS_WS" = true ]; then
    copy_fixture_if_exists "fixtures_ws.py" "fixtures_ws.py"
  fi
  if [ "$HAS_UI" = true ]; then
    copy_fixture_if_exists "fixtures_web_ui.py" "fixtures_web_ui.py"
  fi
  if [ "$HAS_MOBILE" = true ]; then
    copy_fixture_if_exists "fixtures_mobile.py" "fixtures_mobile.py"
  fi
fi

# Print human-friendly status to stderr
echo "Initialized QA output directory at: $OUTPUT_DIR" >&2
echo "  ├── conftest.py     (Invariant Core with dynamic pytest_plugins loader)" >&2
echo "  ├── fixtures/       (__init__.py, data-grounding.json, composable fixtures)" >&2
for f in "${COPIED_FIXTURES[@]}"; do
  echo "  │   └── $f" >&2
done
echo "  ├── steps/          (Automation test steps)" >&2
echo "  └── result/         (test-output.log, report.md, summary.md)" >&2

# JSON Output for programmatic tool calls
COPIED_JSON=$(printf '%s\n' "${COPIED_FIXTURES[@]}" | jq -R . | jq -c -s . 2>/dev/null || echo "[]")
echo "{\"status\": \"ready\", \"issue_key\": \"$ISSUE_KEY\", \"output_dir\": \"$OUTPUT_DIR\", \"types\": \"$TASK_TYPES\", \"copied_fixtures\": $COPIED_JSON}"
