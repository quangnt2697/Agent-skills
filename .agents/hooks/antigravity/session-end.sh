#!/usr/bin/env bash
# ==============================================================================
# Antigravity Stop / PostInvocation Adapter: Auto Save Checkpoint
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
bash "$REPO_ROOT/.agents/hooks/core/session-end.sh"
exit 0
