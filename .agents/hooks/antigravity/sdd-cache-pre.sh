#!/bin/bash
# sdd-cache-pre.sh — Antigravity PreToolUse hook for read_url_content.
#
# HTTP resource cache keyed by URL. Freshness is delegated to the origin via
# HTTP validators; 304 Not Modified is the only signal to serve from cache.
#
# Antigravity PreToolUse contract:
#   Input (stdin):  {"toolCall": {"name": "read_url_content", "args": {"Url": "..."}}, "stepIdx": N, ...}
#   Output (stdout): {"decision": "deny", "reason": "..."} to block with cached content
#                    {} to allow the fetch
#
# Dependencies: jq, curl, shasum (or sha256sum).

set -euo pipefail

# Graceful degradation
command -v jq   >/dev/null 2>&1 || { echo '{}'; exit 0; }
command -v curl >/dev/null 2>&1 || { echo '{}'; exit 0; }
command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1 || { echo '{}'; exit 0; }

if [ -t 0 ]; then INPUT="{}"; else INPUT=$(cat); fi

# Resolve project root from hooks.json CWD (.agents/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Debug logging
dbg() {
  local dir="$PROJECT_ROOT/.agents/sdd-cache"
  [ "${SDD_CACHE_DEBUG:-0}" = "1" ] || [ -f "$dir/.debug" ] || return 0
  mkdir -p "$dir"
  printf '%s [pre-agy]  %s\n' "$(date -u +%FT%TZ)" "$*" >> "$dir/.debug.log"
}
dbg "fired"

# Antigravity uses toolCall.args.Url (capital U)
URL=$(printf '%s' "$INPUT" | jq -r '.toolCall.args.Url // empty' 2>/dev/null || true)
if [ -z "$URL" ]; then dbg "no Url in toolCall.args, exit"; echo '{}'; exit 0; fi
dbg "url=$URL"

# Cache key: sha256(URL), truncated to 128 bits
hash_key() {
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$1" | shasum -a 256 | cut -c1-32
  else
    printf '%s' "$1" | sha256sum | cut -c1-32
  fi
}

CACHE_DIR="$PROJECT_ROOT/.agents/sdd-cache"
CACHE_FILE="$CACHE_DIR/$(hash_key "$URL").json"

if [ ! -f "$CACHE_FILE" ]; then dbg "no cache file, exit"; echo '{}'; exit 0; fi
dbg "cache file exists: $CACHE_FILE"

ETAG=$(jq -r '.etag // empty' "$CACHE_FILE" 2>/dev/null || true)
LAST_MOD=$(jq -r '.last_modified // empty' "$CACHE_FILE" 2>/dev/null || true)

# No validator = cannot verify freshness
if [ -z "$ETAG" ] && [ -z "$LAST_MOD" ]; then
  dbg "no etag/last-modified, bypass"
  echo '{}'
  exit 0
fi

HEADERS=()
[ -n "$ETAG" ]     && HEADERS+=(-H "If-None-Match: $ETAG")
[ -n "$LAST_MOD" ] && HEADERS+=(-H "If-Modified-Since: $LAST_MOD")

STATUS=$(curl -sI -o /dev/null -w "%{http_code}" \
  --max-time 5 -L \
  "${HEADERS[@]}" \
  "$URL" 2>/dev/null || echo "000")
dbg "revalidation HEAD status=$STATUS"

if [ "$STATUS" != "304" ]; then
  dbg "not 304, allowing fetch"
  echo '{}'
  exit 0
fi

# Server confirmed content unchanged — block the fetch and return cached content
CONTENT=$(jq -r '.content // empty' "$CACHE_FILE" 2>/dev/null || true)
if [ -z "$CONTENT" ]; then dbg "empty content, bypass"; echo '{}'; exit 0; fi
dbg "cache HIT, blocking read_url_content with ${#CONTENT} bytes"

ORIGINAL_PROMPT=$(jq -r '.prompt // empty' "$CACHE_FILE" 2>/dev/null || true)
FETCHED_AT=$(jq -r '.fetched_at // 0' "$CACHE_FILE" 2>/dev/null || echo 0)
VERIFIED_AT_ISO=$(date -u -r "$FETCHED_AT" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
              || date -u -d "@$FETCHED_AT" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
              || echo "unknown")

# In Antigravity, we deny the tool call and explain via reason.
# The agent sees the reason and uses the cached content directly.
REASON=$(printf '[sdd-cache] Cache hit for %s\nRevalidated via HTTP 304; unchanged since %s.\n' "$URL" "$VERIFIED_AT_ISO")
if [ -n "$ORIGINAL_PROMPT" ]; then
  REASON=$(printf '%sOriginal prompt: "%s"\n\n' "$REASON" "$ORIGINAL_PROMPT")
fi
REASON=$(printf '%s----- BEGIN CACHED CONTENT -----\n%s\n----- END CACHED CONTENT -----' "$REASON" "$CONTENT")

jq -cn --arg reason "$REASON" '{"decision": "deny", "reason": $reason}'
