Fix specific areas in an Art image using inpainting.

This is Pass 3 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
OUTPUT_DIR="$ART_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Parse $ARGUMENTS for:
- Image path (required) - the refined image to detail
- Mask path (optional) - specific area to fix
- Prompt (required) - description of the fix needed

3. Apply detail inpainting:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$ART_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$ART_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

# If mask provided:
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset $ART_PRESET \
  --phase detail \
  --image "IMAGE_PATH_HERE" \
  --mask "MASK_PATH_HERE" \
  --strength 0.5 \
  --skill art \
  --output "$OUTPUT_DIR/detail-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"

# If no mask (general detail enhancement):
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset $ART_PRESET \
  --phase detail \
  --image "IMAGE_PATH_HERE" \
  --strength 0.5 \
  --skill art \
  --output "$OUTPUT_DIR/detail-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"
```

Replace placeholders with values from $ARGUMENTS.

**Optional overrides in $ARGUMENTS:**
- `--mask /path/to/mask.png` - Area to fix (white = fix, black = preserve)
- `--strength 0.3-0.7` - Denoising strength
- `--model flux-dev|sdxl` - Override detail model
- `--open` - Force open image in Preview
- `--thumbnail` - Force generate thumbnail

**Creating a mask:**
1. Open the image in Preview or another editor
2. Paint white over the area to fix
3. Paint black over areas to preserve
4. Save as PNG

After detail fix:
1. Show output path
2. Compare before/after
3. Suggest /art-recipe to save successful settings

**Usage examples:**
- `/art-detail /path/to/refine.png Sharpen text and fix blurry edges`
- `/art-detail /path/to/refine.png --mask /path/to/mask.png Fix distorted hand`

$ARGUMENTS
