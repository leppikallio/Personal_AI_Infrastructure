Refine an existing composition image.

This is Pass 2 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Parse $ARGUMENTS to extract:
1. `--project NAME` - Project name (required for iteration mode)
2. `--component TYPE` - Component type (required for iteration mode)
3. `--layer NAME` - Layer/refinement name (e.g., "fog", "lighting", "color") - required for iteration mode
4. Source iteration ID or image path (e.g., "001-compose-base" or full path)
5. Optional refinement notes for the prompt

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
  OUTPUT_DIR="$ITER_DIR/${NEXT_NUM}-refine-${LAYER}"
  mkdir -p "$OUTPUT_DIR"
else
  # Legacy date-based output
  OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
  mkdir -p "$OUTPUT_DIR/thumbs"
  SOURCE_PATH="$SOURCE"
  SOURCE_ID=""
fi
```

3. Refine the composition:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

if [ -n "$PROJECT" ]; then
  # Iteration mode - output directly to image.png
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase refine \
    --strength 0.35 \
    --image "$SOURCE_PATH" \
    --output "$OUTPUT_DIR/image.png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "REFINEMENT_PROMPT_HERE"
else
  # Legacy mode
  bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
    --model $PHOTO_MODEL \
    --preset $PHOTO_PRESET \
    --phase refine \
    --strength 0.35 \
    --image "$SOURCE_PATH" \
    --output "$OUTPUT_DIR/refine-$(date +%H%M%S).png" \
    $OPEN_FLAG $THUMB_FLAG \
    --prompt "REFINEMENT_PROMPT_HERE"
fi
```

4. For iteration mode, create metadata.json:
```bash
if [ -n "$PROJECT" ]; then
  cat > "$OUTPUT_DIR/metadata.json" << EOF
{
  "id": "$(basename $OUTPUT_DIR)",
  "phase": "refine",
  "layer": "$LAYER",
  "source": "$SOURCE_ID",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "model": "$PHOTO_MODEL",
  "preset": "$PHOTO_PRESET",
  "strength": 0.35,
  "seed": null,
  "prompt": "REFINEMENT_PROMPT_HERE",
  "notes": ""
}
EOF

  # Generate thumbnail
  # (thumbnail generation command here)
fi
```

Replace SOURCE_PATH with the source image path.
Replace REFINEMENT_PROMPT_HERE with refinement notes or use "Same scene with enhanced realism, 35mm film, soft natural light".

**Optional overrides in $ARGUMENTS:**
- `--preset cinematic|artistic|raw` - Override default preset
- `--model flux-dev|flux-schnell` - Override default model
- `--strength 0.1-0.9` - Override denoising strength
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

After generation:
1. Show the new iteration directory and image path
2. Display the chain: source → this refinement
3. Ask if user wants another refinement or /photo-detail
4. Note the seed for reproducibility

**Usage examples:**
```bash
# Legacy mode
/photo-refine compose-140105-v1.png "enhanced fog and depth"

# Project iteration mode - refine from iteration ID
/photo-refine --project gothic-park --component background --layer fog 001-compose-base "enhance fog density"

# Build chain - refine from previous refine
/photo-refine --project gothic-park --component background --layer lighting 002-refine-fog "warm dawn lighting"

# Alternative approach - branch from same source
/photo-refine --project gothic-park --component background --layer alt-fog 001-compose-base "different fog approach"
```

**Iteration naming convention:**
- `NNN-refine-LAYER` where LAYER describes what this pass changes
- Examples: `002-refine-fog`, `003-refine-lighting`, `004-refine-color`

$ARGUMENTS
