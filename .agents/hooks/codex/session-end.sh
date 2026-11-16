#!/usr/bin/env bash
# Codex Stop/SessionEnd Hook Adapter
set -euo pipefail
ROOT_DIR="${AGENT_SKILLS_HOME:-$(pwd)}"
if [[ -f "$ROOT_DIR/.agents/hooks/core/session-end.sh" ]]; then
  bash "$ROOT_DIR/.agents/hooks/core/session-end.sh" || true
fi
exit 0
