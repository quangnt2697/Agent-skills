#!/usr/bin/env bash
# Codex SessionStart Hook Adapter
set -euo pipefail
ROOT_DIR="${AGENT_SKILLS_HOME:-$(pwd)}"
if [[ -f "$ROOT_DIR/.agents/hooks/core/check-checkpoint-banner.sh" ]]; then
  bash "$ROOT_DIR/.agents/hooks/core/check-checkpoint-banner.sh" || true
fi
exit 0
