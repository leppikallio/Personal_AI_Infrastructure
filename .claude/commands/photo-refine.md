Refine an existing composition image.

This is Pass 2 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Parse $ARGUMENTS to extract:
1. Image path (required) - the composition to refine
2. Optional refinement notes for the prompt

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Refine the composition:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model $PHOTO_MODEL \
  --preset $PHOTO_PRESET \
  --phase refine \
  --strength 0.35 \
  --image "IMAGE_PATH_HERE" \
  --output "$OUTPUT_DIR/refine-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "REFINEMENT_PROMPT_HERE"
```

Replace IMAGE_PATH_HERE with the composition image path.
Replace REFINEMENT_PROMPT_HERE with refinement notes or use "Same scene with enhanced realism, 35mm film, soft natural light".

**Optional overrides in $ARGUMENTS:**
- `--preset cinematic|artistic|raw` - Override default preset
- `--model flux-dev|flux-schnell` - Override default model
- `--strength 0.1-0.9` - Override denoising strength
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

After generation:
1. Show the refined image path
2. Ask if user wants /photo-detail
3. Note the seed for reproducibility

$ARGUMENTS
