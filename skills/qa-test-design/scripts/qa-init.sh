#!/bin/bash
set -e

# qa-init.sh — Initialize directory structure for QA test artifacts.
# Usage: bash skills/qa-test-design/scripts/qa-init.sh [output-dir]
#
# Creates a standardized directory layout for test checklists and .feature files.
# If the directory already exists, reports the existing structure without overwriting.

OUTPUT_DIR="${1:-tests/qa}"

cleanup() {
  # No temporary files to clean in this script
  :
}
trap cleanup EXIT

if [ -d "$OUTPUT_DIR/checklists" ] && [ -d "$OUTPUT_DIR/features" ]; then
  echo "Directory structure already exists: $OUTPUT_DIR" >&2
  CHECKLISTS_COUNT=$(find "$OUTPUT_DIR/checklists" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  FEATURES_COUNT=$(find "$OUTPUT_DIR/features" -name "*.feature" 2>/dev/null | wc -l | tr -d ' ')
  echo "{\"status\": \"exists\", \"output_dir\": \"$OUTPUT_DIR\", \"checklists_dir\": \"$OUTPUT_DIR/checklists\", \"features_dir\": \"$OUTPUT_DIR/features\", \"checklists_count\": $CHECKLISTS_COUNT, \"features_count\": $FEATURES_COUNT}"
  exit 0
fi

mkdir -p "$OUTPUT_DIR/checklists"
mkdir -p "$OUTPUT_DIR/features"

echo "Created QA output directories under: $OUTPUT_DIR" >&2
echo "  checklists/ — execution checklists (.md)" >&2
echo "  features/   — BDD Gherkin feature files (.feature)" >&2

echo "{\"status\": \"ready\", \"output_dir\": \"$OUTPUT_DIR\", \"checklists_dir\": \"$OUTPUT_DIR/checklists\", \"features_dir\": \"$OUTPUT_DIR/features\"}"
