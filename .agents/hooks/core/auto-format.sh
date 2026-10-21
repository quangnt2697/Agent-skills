#!/usr/bin/env bash
# ==============================================================================
# PostToolUse Hook: Tự động format định dạng file sau khi Agent chỉnh sửa
# Dùng chung cho cả Claude Code và Antigravity PostToolUse hooks
# ==============================================================================
set -euo pipefail

TARGET_PATH="${1:-}"

# Nếu không có $1, thử đọc từ stdin
if [[ -z "$TARGET_PATH" ]]; then
  if [ ! -t 0 ]; then
    STDIN_DATA="$(cat)"
    TARGET_PATH="$(echo "$STDIN_DATA" | jq -r '
      .toolCall.args.TargetFile //
      .tool_input.file_path //
      .toolCall.args.path //
      .tool_input.path //
      empty' 2>/dev/null || echo "")"
  fi
fi

if [[ -z "$TARGET_PATH" || ! -f "$TARGET_PATH" ]]; then
  exit 0
fi

# 1. Format file .feature (Gherkin chuẩn: Feature 0, Scenario 2, Steps 4)
if [[ "$TARGET_PATH" == *.feature ]]; then
  python3 -c '
import sys, re

filepath = sys.argv[1]
try:
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
    formatted = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            formatted.append(line.rstrip() + "\n")
            continue
        if re.match(r"^(Feature|Ability|Business Need):", stripped):
            formatted.append(stripped + "\n")
        elif re.match(r"^(Rule|Background|Scenario|Scenario Outline|Example):", stripped):
            formatted.append("  " + stripped + "\n")
        elif re.match(r"^(Given|When|Then|And|But|\*)\b", stripped):
            formatted.append("    " + stripped + "\n")
        elif stripped.startswith("|"):
            formatted.append("      " + stripped + "\n")
        elif stripped.startswith("@"):
            formatted.append(stripped + "\n")
        else:
            formatted.append("    " + stripped + "\n")
    with open(filepath, "w", encoding="utf-8") as f:
        f.writelines(formatted)
except Exception:
    pass
' "$TARGET_PATH" 2>/dev/null || true
fi

# 2. Format file JSON hợp lệ (ngoại trừ file n8n workflows quá lớn)
if [[ "$TARGET_PATH" == *.json && ! "$TARGET_PATH" =~ n8n-workflows/ ]]; then
  if jq . "$TARGET_PATH" > /dev/null 2>&1; then
    TEMP_JSON="$(mktemp)"
    jq . "$TARGET_PATH" > "$TEMP_JSON" 2>/dev/null && mv "$TEMP_JSON" "$TARGET_PATH" || rm -f "$TEMP_JSON"
  fi
fi

exit 0
