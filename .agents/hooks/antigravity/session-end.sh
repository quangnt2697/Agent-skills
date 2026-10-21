#!/usr/bin/env bash
# ==============================================================================
# Antigravity Stop / PostInvocation Adapter: Auto Save Checkpoint
# ==============================================================================
set -euo pipefail

bash .agents/hooks/core/session-end.sh
exit 0
