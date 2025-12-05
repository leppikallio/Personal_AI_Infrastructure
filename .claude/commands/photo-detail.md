Apply detail inpainting to fix specific areas of an image.

This is Pass 3 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Parse $ARGUMENTS to extract:
1. Image path (required) - the refined image to fix
2. Mask path (optional) - white=fix, black=preserve
3. Fix description - what to fix in the masked area

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Apply inpainting (with mask):
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model $PHOTO_MODEL \
  --preset $PHOTO_PRESET \
  --phase detail \
  --strength 0.5 \
  --image "IMAGE_PATH_HERE" \
  --mask "MASK_PATH_HERE" \
  --output "$OUTPUT_DIR/detail-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "FIX_DESCRIPTION_HERE"
```

If no mask provided, omit the --mask flag.

Replace IMAGE_PATH_HERE, MASK_PATH_HERE, and FIX_DESCRIPTION_HERE with user values.

**Optional overrides in $ARGUMENTS:**
- `--preset cinematic|artistic|raw` - Override default preset
- `--model flux-dev|flux-schnell` - Override default model
- `--strength 0.1-0.9` - Override denoising strength
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

If no mask is provided, inform the user:
- Create a mask using any image editor (white = regenerate, black = preserve)
- Common fixes: hands, faces, text, artifacts

$ARGUMENTS
