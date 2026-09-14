#!/bin/bash
set -e

# qa-validate.sh — Validate .feature files against qa-test-design conventions.
# Usage: bash skills/qa-test-design/assets/qa-validate.sh <path>
#
# <path> can be a single .feature file or a directory containing .feature files.
# Outputs a JSON validation report to stdout; status messages to stderr.
#
# Checks:
#   1. Exactly one Feature: block per file
#   2. Feature block has at least one tag (@ prefix)
#   3. Every Scenario/Scenario Outline has at least one tag
#   4. No scenario exceeds 10 steps (Given/When/Then/And/But)
#   5. Given → When → Then order (no loops back to Given after Then)
#   6. No automation mechanics (CSS selectors, xpath expressions, SQL keywords)

TARGET="${1:?Usage: qa-validate.sh <file-or-directory>}"

TMPFILE=""
cleanup() {
  [ -n "$TMPFILE" ] && rm -f "$TMPFILE"
}
trap cleanup EXIT

TMPFILE=$(mktemp)

# Collect .feature files
if [ -d "$TARGET" ]; then
  find "$TARGET" -name "*.feature" -type f | sort > "$TMPFILE"
else
  echo "$TARGET" > "$TMPFILE"
fi

FILE_COUNT=$(wc -l < "$TMPFILE" | tr -d ' ')
if [ "$FILE_COUNT" -eq 0 ]; then
  echo "No .feature files found at: $TARGET" >&2
  echo "{\"status\": \"error\", \"message\": \"No .feature files found\", \"path\": \"$TARGET\"}"
  exit 1
fi

echo "Validating $FILE_COUNT .feature file(s)..." >&2

TOTAL_PASS=0
TOTAL_FAIL=0
VIOLATIONS=""

while IFS= read -r FILE; do
  FILE_VIOLATIONS=""
  FILE_STATUS="pass"

  # --- Check 1: Exactly one Feature: block ---
  FEATURE_COUNT=$(grep -c "^[[:space:]]*Feature:" "$FILE" 2>/dev/null || echo "0")
  if [ "$FEATURE_COUNT" -eq 0 ]; then
    FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"single-feature\", \"message\": \"No Feature: block found\"},"
    FILE_STATUS="fail"
  elif [ "$FEATURE_COUNT" -gt 1 ]; then
    FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"single-feature\", \"message\": \"Multiple Feature: blocks found ($FEATURE_COUNT)\"},"
    FILE_STATUS="fail"
  fi

  # --- Check 2: Feature has tags ---
  FEATURE_LINE=$(grep -n "^[[:space:]]*Feature:" "$FILE" 2>/dev/null | head -1 | cut -d: -f1)
  if [ -n "$FEATURE_LINE" ] && [ "$FEATURE_LINE" -gt 1 ]; then
    PREV_LINE=$((FEATURE_LINE - 1))
    TAG_LINE=$(sed -n "${PREV_LINE}p" "$FILE")
    if ! echo "$TAG_LINE" | grep -q "@"; then
      FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"feature-tags\", \"message\": \"Feature block has no tags (line $FEATURE_LINE)\"},"
      FILE_STATUS="fail"
    fi
  elif [ -n "$FEATURE_LINE" ] && [ "$FEATURE_LINE" -eq 1 ]; then
    FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"feature-tags\", \"message\": \"Feature on line 1 — no room for tags above\"},"
    FILE_STATUS="fail"
  fi

  # --- Check 3: Scenarios have tags ---
  SCENARIO_LINES=$(grep -n "^[[:space:]]*\(Scenario:\|Scenario Outline:\)" "$FILE" 2>/dev/null | cut -d: -f1)
  for SLINE in $SCENARIO_LINES; do
    if [ "$SLINE" -gt 1 ]; then
      PREV=$((SLINE - 1))
      STAG=$(sed -n "${PREV}p" "$FILE")
      if ! echo "$STAG" | grep -q "@"; then
        FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"scenario-tags\", \"message\": \"Scenario at line $SLINE has no tags\"},"
        FILE_STATUS="fail"
      fi
    fi
  done

  # --- Check 4: No scenario exceeds 10 steps ---
  STEP_COUNT=0
  CURRENT_SCENARIO_LINE=0
  while IFS= read -r LINE; do
    TRIMMED=$(echo "$LINE" | sed 's/^[[:space:]]*//')
    case "$TRIMMED" in
      Scenario:*|Scenario\ Outline:*)
        if [ "$STEP_COUNT" -gt 10 ] && [ "$CURRENT_SCENARIO_LINE" -gt 0 ]; then
          FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"max-steps\", \"message\": \"Scenario at line $CURRENT_SCENARIO_LINE has $STEP_COUNT steps (max 10)\"},"
          FILE_STATUS="fail"
        fi
        STEP_COUNT=0
        CURRENT_SCENARIO_LINE=$(grep -n "^[[:space:]]*${TRIMMED%%:*}:" "$FILE" 2>/dev/null | tail -1 | cut -d: -f1)
        ;;
      Given\ *|When\ *|Then\ *|And\ *|But\ *)
        STEP_COUNT=$((STEP_COUNT + 1))
        ;;
    esac
  done < "$FILE"
  # Check last scenario
  if [ "$STEP_COUNT" -gt 10 ] && [ "$CURRENT_SCENARIO_LINE" -gt 0 ]; then
    FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"max-steps\", \"message\": \"Scenario at line $CURRENT_SCENARIO_LINE has $STEP_COUNT steps (max 10)\"},"
    FILE_STATUS="fail"
  fi

  # --- Check 5: Given/When/Then order (no loops) ---
  PHASE=0  # 0=start, 1=Given, 2=When, 3=Then
  LINE_NUM=0
  while IFS= read -r LINE; do
    LINE_NUM=$((LINE_NUM + 1))
    TRIMMED=$(echo "$LINE" | sed 's/^[[:space:]]*//')
    case "$TRIMMED" in
      Scenario:*|Scenario\ Outline:*)
        PHASE=0
        ;;
      Given\ *)
        if [ "$PHASE" -eq 3 ]; then
          FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"gwt-order\", \"message\": \"Given after Then at line $LINE_NUM — step order violation\"},"
          FILE_STATUS="fail"
        fi
        PHASE=1
        ;;
      When\ *)
        if [ "$PHASE" -eq 3 ]; then
          FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"gwt-order\", \"message\": \"When after Then at line $LINE_NUM — step order violation\"},"
          FILE_STATUS="fail"
        fi
        PHASE=2
        ;;
      Then\ *)
        PHASE=3
        ;;
    esac
  done < "$FILE"

  # --- Check 6: No automation mechanics ---
  ANTI_PATTERNS='(xpath|css[Ss]elector|getElementById|querySelector|#[a-z_-]*btn|\.click\(\)|SELECT .* FROM|INSERT INTO|DELETE FROM|waitFor|scrollTo|scroll_to)'
  ANTI_HITS=$(grep -nE "$ANTI_PATTERNS" "$FILE" 2>/dev/null || true)
  if [ -n "$ANTI_HITS" ]; then
    while IFS= read -r HIT; do
      HIT_LINE=$(echo "$HIT" | cut -d: -f1)
      FILE_VIOLATIONS="${FILE_VIOLATIONS}{\"rule\": \"no-automation\", \"message\": \"Automation mechanics detected at line $HIT_LINE\"},"
      FILE_STATUS="fail"
    done <<< "$ANTI_HITS"
  fi

  # Accumulate results
  if [ "$FILE_STATUS" = "pass" ]; then
    TOTAL_PASS=$((TOTAL_PASS + 1))
    echo "  ✓ $FILE" >&2
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    echo "  ✗ $FILE" >&2
    # Remove trailing comma from violations
    FILE_VIOLATIONS=$(echo "$FILE_VIOLATIONS" | sed 's/,$//')
    VIOLATIONS="${VIOLATIONS}{\"file\": \"$FILE\", \"status\": \"fail\", \"violations\": [$FILE_VIOLATIONS]},"
  fi

done < "$TMPFILE"

# Remove trailing comma
VIOLATIONS=$(echo "$VIOLATIONS" | sed 's/,$//')

echo "" >&2
echo "Results: $TOTAL_PASS passed, $TOTAL_FAIL failed out of $FILE_COUNT file(s)" >&2

if [ "$TOTAL_FAIL" -eq 0 ]; then
  STATUS="pass"
else
  STATUS="fail"
fi

echo "{\"status\": \"$STATUS\", \"total\": $FILE_COUNT, \"passed\": $TOTAL_PASS, \"failed\": $TOTAL_FAIL, \"failures\": [$VIOLATIONS]}"
