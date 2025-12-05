#!/bin/bash
# Get photorealistic output directory from settings.json
# Falls back to default if not configured

SETTINGS_FILE="$HOME/.claude/settings.json"
DEFAULT_DIR="$HOME/.claude/history/photorealistic"

if [ -f "$SETTINGS_FILE" ] && command -v jq &> /dev/null; then
  CONFIGURED=$(jq -r '.photorealistic.outputDir // empty' "$SETTINGS_FILE" 2>/dev/null)
  if [ -n "$CONFIGURED" ]; then
    # Expand ~ to $HOME
    echo "${CONFIGURED/#\~/$HOME}"
    exit 0
  fi
fi

echo "$DEFAULT_DIR"
