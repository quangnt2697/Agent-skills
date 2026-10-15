#!/bin/bash
# ==============================================================================
# qa-validate.sh — Wrapper chuyển tiếp tới scripts/qa/qa-validate.js
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

exec node "$REPO_ROOT/scripts/qa/qa-validate.js" "$@"
