#!/usr/bin/env bash
set -euo pipefail

SECRETS_FILE="${1:-${VOICEINK_SECRETS_FILE:-$HOME/.voiceink-secrets/qwen.env}}"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "Missing secrets file: $SECRETS_FILE" >&2
  echo "Create it with CUSTOM_TRANSCRIPTION_API_KEY / CUSTOM_REASONING_API_KEY." >&2
  exit 1
fi

while IFS= read -r line; do
  case "$line" in
    ''|'#'*) continue ;;
    *)
      if [[ "$line" != *=* ]]; then
        continue
      fi
      key="${line%%=*}"
      value="${line#*=}"
      if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
        continue
      fi
      printf 'export %s=%q\n' "$key" "$value"
      ;;
  esac
done < "$SECRETS_FILE"
