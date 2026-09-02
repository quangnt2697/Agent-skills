#!/bin/bash
# agent-skills session start hook — Antigravity edition
# Injects the using-agent-skills meta-skill into the first invocation.
#
# Antigravity PreInvocation contract:
#   Input (stdin):  {"invocationNum": N, "workspacePaths": [...], ...}
#   Output (stdout): {"injectSteps": [{"ephemeralMessage": "..."}]}
#
# Only injects on the first invocation (invocationNum == 0 or 1) to avoid
# flooding every model call with the full skill content.

set -euo pipefail

# The hooks.json CWD is set to the directory containing hooks.json, which is
# .agents/ — so we go up one level to find the project root and then into hooks/.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/skills"

# Also check inside plugins/core/skills/ (the actual layout of this repo)
META_SKILL="$SKILLS_DIR/meta-using-agent-skills/SKILL.md"
[ -f "$META_SKILL" ] || META_SKILL="$SKILLS_DIR/using-agent-skills/SKILL.md"
[ -f "$META_SKILL" ] || META_SKILL="$PROJECT_ROOT/plugins/core/skills/meta-using-agent-skills/SKILL.md"

# Read stdin — Antigravity sends JSON with invocationNum
if [ -t 0 ]; then INPUT="{}"; else INPUT=$(cat); fi

# Dependencies check
if ! command -v jq >/dev/null 2>&1; then
  jq -cn '{injectSteps: [{ephemeralMessage: "agent-skills: jq is required for the session-start hook but was not found on PATH. Install jq (e.g. `brew install jq`) to enable meta-skill injection. Skills remain available individually."}]}' 2>/dev/null \
    || echo '{"injectSteps": [{"ephemeralMessage": "agent-skills: jq not found. Skills available individually."}]}'
  exit 0
fi

# Only inject on the first invocation to save context window
INVOCATION_NUM=$(printf '%s' "$INPUT" | jq -r '.invocationNum // 0' 2>/dev/null || echo "0")
if [ "$INVOCATION_NUM" -gt 1 ] 2>/dev/null; then
  echo '{}'
  exit 0
fi

if [ -f "$META_SKILL" ]; then
  CONTENT=$(cat "$META_SKILL")
  jq -cn \
    --arg msg "agent-skills loaded. Use the skill discovery flowchart to find the right skill for your task.

$CONTENT" \
    '{injectSteps: [{ephemeralMessage: $msg}]}'
else
  echo '{"injectSteps": [{"ephemeralMessage": "agent-skills: meta-using-agent-skills meta-skill not found. Skills may still be available individually."}]}'
fi
