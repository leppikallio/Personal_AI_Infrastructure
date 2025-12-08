Start an Art composition phase with options to choose from.

This is Pass 1 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
OUTPUT_DIR="$ART_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Generate composition variations:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$ART_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$ART_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model $ART_MODEL \
  --preset $ART_PRESET \
  --size $ART_SIZE \
  --aspect-ratio $ART_ASPECT \
  --phase composition \
  --creative-variations $ART_BATCH \
  --skill art \
  --output "$OUTPUT_DIR/compose-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"
```

Replace PROMPT_HERE with the user's prompt from $ARGUMENTS.

**Optional overrides in $ARGUMENTS:**
- `--preset photorealistic|cinematic|artistic|raw` - Override default preset
- `--model flux|flux-pro|nano-banana-pro|gpt-image-1` - Override default model
- `--batch N` - Override number of variations (1-10)
- `--open` - Force open images in Preview (overrides config)
- `--thumbnail` - Force generate thumbnails (overrides config)

After generation:
1. List all variations (compose-*-v1.png through v$ART_BATCH.png)
2. Ask the user which composition they prefer (1-$ART_BATCH)
3. Note the chosen path for /art-refine

$ARGUMENTS
