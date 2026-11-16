#!/usr/bin/env bash
# ==============================================================================
# Codex PreToolUse Hook Adapter
# Chặn sớm các thao tác vi phạm trước khi shell/apply_patch chạy:
#   - Lệnh nguy hiểm / nhánh main (core/check-branch.sh)
#   - Chạy pytest không ghi test-output.log (core/check-qa-log.sh)
#   - Ghi ngoài workspace/ hoặc thư mục rác (core/check-workspace-path.sh) — hỗ trợ đa file
#   - Rò rỉ secret / API token (core/check-secrets.sh)
# Khi từ chối: ghi lý do ra stderr và thoát mã 2 (chuẩn Codex PreToolUse block).
# ==============================================================================
set -euo pipefail

ROOT_DIR="${AGENT_SKILLS_HOME:-$(pwd)}"
INPUT="$(cat)"

if [[ -z "$INPUT" ]]; then
  exit 0
fi

# Tách thông tin bằng node (không phụ thuộc jq, hỗ trợ tool_input dạng string JSON và apply_patch đa file)
PARSED="$(INPUT_JSON="$INPUT" node -e '
  let d = {};
  try { d = JSON.parse(process.env.INPUT_JSON || "{}"); } catch {}
  let ti = d.tool_input ?? d.input ?? d.arguments ?? {};
  if (typeof ti === "string") {
    try { ti = JSON.parse(ti); } catch { ti = { patch: ti }; }
  }
  const cmd = ti.command || ti.cmd || d.command || "";
  const filePaths = [];
  if (ti.file_path) filePaths.push(String(ti.file_path).trim());
  else if (ti.path) filePaths.push(String(ti.path).trim());
  const content = ti.content || ti.new_string || ti.patch || (typeof d.tool_input === "string" ? d.tool_input : "") || "";
  if (typeof content === "string") {
    for (const m of content.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/gm)) {
      const fp = m[1].trim();
      if (fp && !filePaths.includes(fp)) filePaths.push(fp);
    }
  }
  process.stdout.write(JSON.stringify({ cmd, filePaths, content }));
' 2>/dev/null || echo '{"cmd":"","filePaths":[],"content":""}')"

CMD="$(node -e "const o=JSON.parse(process.argv[1]);process.stdout.write(o.cmd||'')" "$PARSED")"
CONTENT="$(node -e "const o=JSON.parse(process.argv[1]);process.stdout.write(o.content||'')" "$PARSED")"
FILE_PATHS_NL="$(node -e "const o=JSON.parse(process.argv[1]);process.stdout.write((o.filePaths||[]).join('\n'))" "$PARSED")"

if [[ -n "$CMD" ]]; then
  if echo "$CMD" | grep -qE "git[[:space:]]+commit"; then
    if ! ERR_MSG=$(bash "$ROOT_DIR/.agents/hooks/core/check-branch.sh" 2>&1); then
      echo "$ERR_MSG" >&2
      exit 2
    fi
  fi
  if echo "$CMD" | grep -qE "git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f|git[[:space:]]+push[[:space:]]+.*(--force|-f)|(pip|pip3)[[:space:]]+install|npm[[:space:]]+(i|install)\b|rm[[:space:]]+-rf[[:space:]]+(/|~|\.\.)"; then
    echo "⚠️ [AUTONOMY GUARD] Lệnh nhạy cảm/nguy hiểm bị chặn trên hook Codex: '$CMD'." >&2
    exit 2
  fi
  if ! ERR_MSG=$(bash "$ROOT_DIR/.agents/hooks/core/check-qa-log.sh" "$CMD" 2>&1); then
    echo "$ERR_MSG" >&2
    exit 2
  fi
fi

FIRST_FILE=""
if [[ -n "$FILE_PATHS_NL" ]]; then
  while IFS= read -r FP; do
    [[ -z "$FP" ]] && continue
    [[ -z "$FIRST_FILE" ]] && FIRST_FILE="$FP"
    if ! ERR_MSG=$(bash "$ROOT_DIR/.agents/hooks/core/check-workspace-path.sh" "$FP" 2>&1); then
      echo "$ERR_MSG" >&2
      exit 2
    fi
  done <<< "$FILE_PATHS_NL"
fi

if [[ -n "$CONTENT" ]]; then
  if ! ERR_MSG=$(bash "$ROOT_DIR/.agents/hooks/core/check-secrets.sh" "$FIRST_FILE" "$CONTENT" 2>&1); then
    echo "$ERR_MSG" >&2
    exit 2
  fi
fi

exit 0
