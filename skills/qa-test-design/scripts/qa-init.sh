#!/bin/bash
set -e

# qa-init.sh — Initialize directory structure for QA test artifacts.
# Usage: bash skills/qa-test-design/scripts/qa-init.sh <issueKey> [workspace-root]
#
# Creates workspace/<issueKey>/test/{steps,result}/ per the canonical layout in
# .claude/rules/workspace-paths.md. checklist.md and <issueKey>.feature are
# written directly into test/ by the skill, so they need no subdirectory.
#
# Convention: issueKey is always stored in LOWER CASE for consistency.
# Example: qa-init.sh G3PTP-16825

ISSUE_KEY_RAW="${1:?Usage: qa-init.sh <issueKey> [workspace-root]}"
WORKSPACE_ROOT="${2:-workspace}"

# Normalize issue key to lower case for consistent directory naming
ISSUE_KEY=$(echo "$ISSUE_KEY_RAW" | tr '[:upper:]' '[:lower:]')

OUTPUT_DIR="${WORKSPACE_ROOT}/${ISSUE_KEY}/test"

cleanup() {
  # No temporary files to clean in this script
  :
}
trap cleanup EXIT

if [ -d "$OUTPUT_DIR" ]; then
  echo "Directory already exists: $OUTPUT_DIR" >&2
  CHECKLISTS_COUNT=$(find "$OUTPUT_DIR" -name "*checklist*.md" 2>/dev/null | wc -l | tr -d ' ')
  FEATURES_COUNT=$(find "$OUTPUT_DIR" -name "*.feature" 2>/dev/null | wc -l | tr -d ' ')
  STEPS_COUNT=$(find "$OUTPUT_DIR" -name "test_*.py" 2>/dev/null | wc -l | tr -d ' ')
  REPORTS_COUNT=$(find "$OUTPUT_DIR" -name "*report*.md" 2>/dev/null | wc -l | tr -d ' ')
  echo "{\"status\": \"exists\", \"issue_key\": \"$ISSUE_KEY\", \"output_dir\": \"$OUTPUT_DIR\", \"checklists_count\": $CHECKLISTS_COUNT, \"features_count\": $FEATURES_COUNT, \"steps_count\": $STEPS_COUNT, \"reports_count\": $REPORTS_COUNT}"
  exit 0
fi

# Create standardized directory structure
mkdir -p "$OUTPUT_DIR/steps"
mkdir -p "$OUTPUT_DIR/result"

echo "Created QA output directory at: $OUTPUT_DIR" >&2
echo "  ├── checklist.md   (written by qa-test-design)" >&2
echo "  ├── steps/         (test_*.py automation scripts)" >&2
echo "  └── result/        (test result reports)" >&2

echo "{\"status\": \"ready\", \"issue_key\": \"$ISSUE_KEY\", \"output_dir\": \"$OUTPUT_DIR\", \"structure\": {\"steps\": \"$OUTPUT_DIR/steps\", \"result\": \"$OUTPUT_DIR/result\"}}"
