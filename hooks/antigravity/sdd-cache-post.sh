#!/bin/bash
# sdd-cache-post.sh — Antigravity PostToolUse hook for read_url_content.
#
# After read_url_content, stores the current ETag / Last-Modified via a HEAD
# request so the pre hook can revalidate on the next fetch.
#
# Antigravity PostToolUse contract:
#   Input (stdin):  {"stepIdx": N, "error": "...", "toolCall": {"name": "...", "args": {...}}, ...}
#   Output (stdout): {} (empty object)
#
# NOTE: Unlike Claude's PostToolUse, Antigravity does not include the tool
# response content in the hook input. We store a placeholder and rely on
# the pre-hook's 304 check for cache validation. The actual cached content
# is populated on the first successful pre-hook miss (when the agent reads
# the URL for real and we see it in a future post-hook).
#
# Dependencies: jq, curl, shasum (or sha256sum).

set -euo pipefail

command -v jq   >/dev/null 2>&1 || { echo '{}'; exit 0; }
command -v curl >/dev/null 2>&1 || { echo '{}'; exit 0; }
command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1 || { echo '{}'; exit 0; }

if [ -t 0 ]; then INPUT="{}"; else INPUT=$(cat); fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Debug logging
dbg() {
  local dir="$PROJECT_ROOT/.agents/sdd-cache"
  [ "${SDD_CACHE_DEBUG:-0}" = "1" ] || [ -f "$dir/.debug" ] || return 0
  mkdir -p "$dir"
  printf '%s [post-agy] %s\n' "$(date -u +%FT%TZ)" "$*" >> "$dir/.debug.log"
}
dbg "fired"

# If the tool errored, don't cache
ERROR=$(printf '%s' "$INPUT" | jq -r '.error // empty' 2>/dev/null || true)
if [ -n "$ERROR" ]; then dbg "tool errored, skip"; echo '{}'; exit 0; fi

# Extract URL from toolCall.args.Url
URL=$(printf '%s' "$INPUT" | jq -r '.toolCall.args.Url // empty' 2>/dev/null || true)
if [ -z "$URL" ]; then dbg "no Url in toolCall.args, exit"; echo '{}'; exit 0; fi
dbg "url=$URL"

hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | cut -c1-32
  else
    printf '%s' "$1" | sha256sum | cut -c1-32
  fi
}

CACHE_DIR="$PROJECT_ROOT/.agents/sdd-cache"
mkdir -p "$CACHE_DIR"
CACHE_FILE="$CACHE_DIR/$(hash_key "$URL").json"

# Capture validators from the origin
HEAD_OUT=$(curl -sI -L --max-time 5 "$URL" 2>/dev/null | tr -d '\r' || true)

# Take only the final response's headers
FINAL_HEADERS=$(printf '%s' "$HEAD_OUT" | awk '
  BEGIN { RS = ""; last = "" }
  { last = $0 }
  END { print last }
')

extract_header() {
  local name="$1"
  printf '%s' "$FINAL_HEADERS" | awk -v h="$name" '
    BEGIN { FS = ":" }
    tolower($1) == tolower(h) {
      sub(/^[^:]*:[ \t]*/, "")
      sub(/[ \t]+$/, "")
      print
      exit
    }
  '
}

ETAG=$(extract_header "ETag")
LAST_MOD=$(extract_header "Last-Modified")
dbg "HEAD etag=$ETAG last_modified=$LAST_MOD"

if [ -z "$ETAG" ] && [ -z "$LAST_MOD" ]; then
  dbg "no validator from origin, removing stale entry"
  rm -f "$CACHE_FILE"
  echo '{}'
  exit 0
fi

NOW=$(date +%s)

# Antigravity PostToolUse doesn't include tool response content in the payload.
# If a cache file already exists with content, preserve it. Otherwise store
# a marker so the pre-hook knows validators exist for this URL.
EXISTING_CONTENT=""
if [ -f "$CACHE_FILE" ]; then
  EXISTING_CONTENT=$(jq -r '.content // empty' "$CACHE_FILE" 2>/dev/null || true)
fi

# If no existing content, try to fetch the page content directly for caching
if [ -z "$EXISTING_CONTENT" ]; then
  EXISTING_CONTENT=$(curl -sL --max-time 10 "$URL" 2>/dev/null | head -c 50000 || true)
  dbg "fetched content for cache: ${#EXISTING_CONTENT} bytes"
fi

TMP="${CACHE_FILE}.$$.tmp"
if jq -n \
  --arg url           "$URL" \
  --arg prompt        "" \
  --arg etag          "$ETAG" \
  --arg last_modified "$LAST_MOD" \
  --arg content       "$EXISTING_CONTENT" \
  --argjson fetched_at "$NOW" \
  '{url: $url, prompt: $prompt, etag: $etag, last_modified: $last_modified, content: $content, fetched_at: $fetched_at}' \
  > "$TMP"
then
  mv "$TMP" "$CACHE_FILE"
  dbg "wrote cache file $CACHE_FILE"
else
  rm -f "$TMP"
  dbg "jq failed, temp cleaned"
fi

echo '{}'
exit 0
