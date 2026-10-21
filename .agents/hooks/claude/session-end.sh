#!/usr/bin/env bash
# ==============================================================================
# Claude Code SessionEnd Adapter: Auto Save Checkpoint
# ==============================================================================
set -euo pipefail

bash "${CLAUDE_PROJECT_DIR:-.}/.agents/hooks/core/session-end.sh"
exit 0
