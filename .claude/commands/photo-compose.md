Start a photorealistic composition phase with options to choose from.

This is Pass 1 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
```

2. Parse $ARGUMENTS for flags:
   - `--project NAME` - Project name (required for iteration mode)
   - `--component TYPE` - Component type (background, bridge, bench, figure, prop, overlay)
   - `--name NAME` - Iteration name (e.g., "base", "alt", "v2") - defaults to timestamp
   - `--preset cinematic|artistic|raw` - Override default preset
   - `--model flux-dev|flux-schnell` - Override default model
   - `--batch N` - Override number of variations (1-10)
   - `--open` - Force open images in Preview (overrides config)
   - `--thumbnail` - Force generate thumbnails (overrides config)
   - Everything else is the prompt

3. Determine output directory:
```bash
if [ -n "$PROJECT" ] && [ -n "$COMPONENT" ]; then
  # Project iteration mode
  COMP_DIR="$PHOTO_DIR/projects/$PROJECT/components/$COMPONENT"
  ITER_DIR="$COMP_DIR/iterations"
  mkdir -p "$ITER_DIR"

  # Get next iteration number
  LAST_NUM=$(ls -1d "$ITER_DIR"/[0-9][0-9][0-9]-* 2>/dev/null | tail -1 | grep -o '[0-9]\{3\}' | head -1)
  NEXT_NUM=$(printf "%03d" $((${LAST_NUM:-0} + 1)))

  # Create iteration directory
  ITER_NAME="${NAME:-$(date +%H%M%S)}"
  OUTPUT_DIR="$ITER_DIR/${NEXT_NUM}-compose-${ITER_NAME}"
  mkdir -p "$OUTPUT_DIR/variations"
else
  # Legacy date-based output
  OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
  mkdir -p "$OUTPUT_DIR/thumbs"
fi
```

4. Generate composition variations:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

# For iteration mode, output to variations/
if [ -n "$PROJECT" ]; then
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase composition \
    --creative-variations $PHOTO_BATCH \
    --output "$OUTPUT_DIR/variations/v.png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "PROMPT_HERE"
else
  # Legacy mode
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase composition \
    --creative-variations $PHOTO_BATCH \
    --output "$OUTPUT_DIR/compose-$(date +%H%M%S).png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "PROMPT_HERE"
fi
```

5. For iteration mode, create metadata.json:
```bash
if [ -n "$PROJECT" ]; then
  cat > "$OUTPUT_DIR/metadata.json" << EOF
{
  "id": "$(basename $OUTPUT_DIR)",
  "phase": "compose",
  "name": "$ITER_NAME",
  "source": null,
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "model": "$PHOTO_MODEL",
  "preset": "$PHOTO_PRESET",
  "seed": null,
  "prompt": "PROMPT_HERE",
  "selected_variation": null,
  "variations_count": $PHOTO_BATCH,
  "notes": ""
}
EOF
fi
```

6. After generation:
   - List all variations (v1.png through v$PHOTO_BATCH.png)
   - Ask user to select preferred variation (1-$PHOTO_BATCH)
   - Copy selected to image.png and update metadata.json
   - Generate thumb.png from selected

**Selection after generation:**
```bash
# User selects variation N
cp "$OUTPUT_DIR/variations/v$N.png" "$OUTPUT_DIR/image.png"
# Update metadata.json selected_variation field
```

**Usage examples:**
```bash
# Legacy mode (date-based)
/photo-compose "Atmospheric gothic park at dawn"

# Project iteration mode
/photo-compose --project gothic-park --component background --name base "Atmospheric gothic park at dawn"
/photo-compose --project gothic-park --component bridge --name stone "Ancient stone bridge"
```

$ARGUMENTS
