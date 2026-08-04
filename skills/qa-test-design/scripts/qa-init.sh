#!/bin/bash
set -e

# qa-init.sh — Initialize directory structure for QA test artifacts.
# Usage: bash skills/qa-test-design/scripts/qa-init.sh [output-dir]
#
# Creates a standardized directory layout for test checklists and .feature files.
# If the directory already exists, reports the existing structure without overwriting.

OUTPUT_DIR="${1:-tests/qa-test-design/}"

cleanup() {
  # No temporary files to clean in this script
  :
}
trap cleanup EXIT

if [ -d "$OUTPUT_DIR" ]; then
  echo "Directory already exists: $OUTPUT_DIR" >&2
  CHECKLISTS_COUNT=$(find "$OUTPUT_DIR" -name "*checklist*.md" 2>/dev/null | wc -l | tr -d ' ')
  FEATURES_COUNT=$(find "$OUTPUT_DIR" -name "*.feature" 2>/dev/null | wc -l | tr -d ' ')
  echo "{\"status\": \"exists\", \"output_dir\": \"$OUTPUT_DIR\", \"checklists_count\": $CHECKLISTS_COUNT, \"features_count\": $FEATURES_COUNT}"
  exit 0
fi

mkdir -p "$OUTPUT_DIR"

echo "Created QA output directory at: $OUTPUT_DIR" >&2

echo "{\"status\": \"ready\", \"output_dir\": \"$OUTPUT_DIR\"}"
