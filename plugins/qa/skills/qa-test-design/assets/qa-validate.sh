#!/bin/bash
# ==============================================================================
# qa-validate.sh — Wrapper chuyển tiếp tới scripts/qa/qa-validate.js
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${AGENT_SKILLS_HOME:-}"
if [[ -z "$REPO_ROOT" || ! -f "$REPO_ROOT/scripts/qa/qa-validate.js" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
fi

exec node "$REPO_ROOT/scripts/qa/qa-validate.js" "$@"
