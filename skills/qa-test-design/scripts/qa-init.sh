#!/bin/bash
set -e

# qa-init.sh — Initialize directory structure for QA test artifacts.
# Usage: bash skills/qa-test-design/scripts/qa-init.sh [issueKey] [output-base]
#
# Creates a standardized directory layout for test checklists, .feature files,
# test steps, and reports per issue key.
#
# Convention: issueKey is always stored in LOWER CASE for consistency.
# Example: qa-init.sh G3PTP-16825 workspace/{issueKey}/tests/qa-test-design

ISSUE_KEY_RAW="${1:?Usage: qa-init.sh <issueKey> [output-base-dir]}"
OUTPUT_BASE="${2:-workspace/{issueKey}/tests/qa-test-design}"

# Normalize issue key to lower case for consistent directory naming
ISSUE_KEY=$(echo "$ISSUE_KEY_RAW" | tr '[:upper:]' '[:lower:]')

OUTPUT_DIR="${OUTPUT_BASE}/${ISSUE_KEY}"

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
mkdir -p "$OUTPUT_DIR/features"
mkdir -p "$OUTPUT_DIR/steps"
mkdir -p "$OUTPUT_DIR/reports"

echo "Created QA output directory at: $OUTPUT_DIR" >&2
echo "  ├── features/    (checklist + .feature files)" >&2
echo "  ├── steps/        (test_*.py automation scripts)" >&2
echo "  └── reports/      (test result reports)" >&2

echo "{\"status\": \"ready\", \"issue_key\": \"$ISSUE_KEY\", \"output_dir\": \"$OUTPUT_DIR\", \"structure\": {\"features\": \"$OUTPUT_DIR/features\", \"steps\": \"$OUTPUT_DIR/steps\", \"reports\": \"$OUTPUT_DIR/reports\"}}"
