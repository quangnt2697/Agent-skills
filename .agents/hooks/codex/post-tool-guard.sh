#!/usr/bin/env bash
# Codex PostToolUse Hook Adapter: Auto-format artifacts (.feature, .json, .md) — hỗ trợ đa file
set -euo pipefail

ROOT_DIR="${AGENT_SKILLS_HOME:-$(pwd)}"
INPUT="$(cat)"

if [[ -z "$INPUT" ]]; then
  exit 0
fi

FILE_PATHS_NL="$(INPUT_JSON="$INPUT" node -e '
  let d = {};
  try { d = JSON.parse(process.env.INPUT_JSON || "{}"); } catch {}
  let ti = d.tool_input ?? d.input ?? d.arguments ?? {};
  if (typeof ti === "string") {
    try { ti = JSON.parse(ti); } catch { ti = { patch: ti }; }
  }
  const filePaths = [];
  if (ti.file_path) filePaths.push(String(ti.file_path).trim());
  else if (ti.path) filePaths.push(String(ti.path).trim());
  const patch = ti.patch || (typeof d.tool_input === "string" ? d.tool_input : "") || "";
  if (typeof patch === "string") {
    for (const m of patch.matchAll(/^\*\*\* (?:Add|Update) File:\s*(.+)$/gm)) {
      const fp = m[1].trim();
      if (fp && !filePaths.includes(fp)) filePaths.push(fp);
    }
  }
  process.stdout.write(filePaths.join("\n"));
' 2>/dev/null || echo "")"

if [[ -n "$FILE_PATHS_NL" ]]; then
  while IFS= read -r FP; do
    if [[ -n "$FP" && -f "$FP" ]]; then
      bash "$ROOT_DIR/.agents/hooks/core/auto-format.sh" "$FP" || true
    fi
  done <<< "$FILE_PATHS_NL"
fi

exit 0
