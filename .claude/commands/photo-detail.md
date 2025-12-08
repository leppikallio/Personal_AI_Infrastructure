Apply detail inpainting to fix specific areas of an image.

This is Pass 3 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Parse $ARGUMENTS to extract:
1. `--project NAME` - Project name (required for iteration mode)
2. `--component TYPE` - Component type (required for iteration mode)
3. `--layer NAME` - Layer/fix name (e.g., "hands", "face", "text") - required for iteration mode
4. Source iteration ID or image path (e.g., "003-refine-lighting" or full path)
5. `--mask PATH` - Mask image path (white=fix, black=preserve)
6. Fix description - what to fix in the masked area

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
```

2. Determine output directory and source:
```bash
if [ -n "$PROJECT" ] && [ -n "$COMPONENT" ] && [ -n "$LAYER" ]; then
  # Project iteration mode
  COMP_DIR="$PHOTO_DIR/projects/$PROJECT/components/$COMPONENT"
  ITER_DIR="$COMP_DIR/iterations"
  MASKS_DIR="$PHOTO_DIR/projects/$PROJECT/masks"

  # Resolve source - can be iteration ID or path
  if [[ "$SOURCE" == [0-9][0-9][0-9]-* ]]; then
    SOURCE_PATH="$ITER_DIR/$SOURCE/image.png"
    SOURCE_ID="$SOURCE"
  else
    SOURCE_PATH="$SOURCE"
    SOURCE_ID=$(basename $(dirname "$SOURCE"))
  fi

  # Get next iteration number
  LAST_NUM=$(ls -1d "$ITER_DIR"/[0-9][0-9][0-9]-* 2>/dev/null | tail -1 | grep -o '[0-9]\{3\}' | head -1)
  NEXT_NUM=$(printf "%03d" $((${LAST_NUM:-0} + 1)))

  # Create iteration directory
  OUTPUT_DIR="$ITER_DIR/${NEXT_NUM}-detail-${LAYER}"
  mkdir -p "$OUTPUT_DIR"
else
  # Legacy date-based output
  OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
  mkdir -p "$OUTPUT_DIR/thumbs"
  SOURCE_PATH="$SOURCE"
  SOURCE_ID=""
fi
```

3. Apply inpainting:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
MASK_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"
[ -n "$MASK" ] && MASK_FLAG="--mask $MASK"

if [ -n "$PROJECT" ]; then
  # Iteration mode - output directly to image.png
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase detail \
    --strength 0.5 \
    --image "$SOURCE_PATH" \
    $MASK_FLAG \
    --output "$OUTPUT_DIR/image.png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "FIX_DESCRIPTION_HERE"

  # Copy mask to iteration directory if used
  [ -n "$MASK" ] && cp "$MASK" "$OUTPUT_DIR/mask.png"
else
  # Legacy mode
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase detail \
    --strength 0.5 \
    --image "$SOURCE_PATH" \
    $MASK_FLAG \
    --output "$OUTPUT_DIR/detail-$(date +%H%M%S).png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "FIX_DESCRIPTION_HERE"
fi
```

4. For iteration mode, create metadata.json:
```bash
if [ -n "$PROJECT" ]; then
  MASK_FILE=""
  [ -n "$MASK" ] && MASK_FILE="mask.png"

  cat > "$OUTPUT_DIR/metadata.json" << EOF
{
  "id": "$(basename $OUTPUT_DIR)",
  "phase": "detail",
  "layer": "$LAYER",
  "source": "$SOURCE_ID",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "model": "$PHOTO_MODEL",
  "preset": "$PHOTO_PRESET",
  "strength": 0.5,
  "seed": null,
  "mask": "$MASK_FILE",
  "prompt": "FIX_DESCRIPTION_HERE",
  "notes": ""
}
EOF

  # Generate thumbnail
  # (thumbnail generation command here)
fi
```

Replace SOURCE_PATH, MASK, and FIX_DESCRIPTION_HERE with user values.

**Optional overrides in $ARGUMENTS:**
- `--preset cinematic|artistic|raw` - Override default preset
- `--model flux-dev|flux-schnell` - Override default model
- `--strength 0.1-0.9` - Override denoising strength
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

If no mask is provided, inform the user:
- Create a mask using any image editor (white = regenerate, black = preserve)
- Save masks to: `$PHOTO_DIR/projects/$PROJECT/masks/`
- Common fixes: hands, faces, text, artifacts

After generation:
1. Show the new iteration directory and image path
2. Display the chain: source → this detail fix
3. Ask if user wants another detail pass or is done
4. Note the seed for reproducibility

**Usage examples:**
```bash
# Legacy mode
/photo-detail refine-140105.png --mask mask.png "fix the hands"

# Project iteration mode - detail from iteration ID
/photo-detail --project gothic-park --component background --layer hands 003-refine-lighting --mask hands.png "fix hands"

# Build chain - detail from previous detail
/photo-detail --project gothic-park --component background --layer face 004-detail-hands --mask face.png "fix face"

# Detail without mask (global refinement)
/photo-detail --project gothic-park --component background --layer polish 005-detail-face "final polish, reduce artifacts"
```

**Iteration naming convention:**
- `NNN-detail-LAYER` where LAYER describes what this pass fixes
- Examples: `004-detail-hands`, `005-detail-face`, `006-detail-text`

**Mask storage:**
- Project masks: `$PHOTO_DIR/projects/$PROJECT/masks/`
- Iteration masks: Copied to iteration directory as `mask.png`

$ARGUMENTS
