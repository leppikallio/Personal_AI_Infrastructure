Refine a selected Art composition using img2img enhancement.

This is Pass 2 of the 3-pass workflow: COMPOSITION -> REFINEMENT -> DETAIL

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
OUTPUT_DIR="$ART_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Parse $ARGUMENTS for:
- Image path (required) - the composition to refine
- Prompt (optional) - refinement guidance, or reuse original

3. Refine the image:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$ART_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$ART_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model flux-dev \
  --preset $ART_PRESET \
  --phase refine \
  --image "IMAGE_PATH_HERE" \
  --strength 0.35 \
  --skill art \
  --output "$OUTPUT_DIR/refine-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"
```

Replace IMAGE_PATH_HERE with the user's image path from $ARGUMENTS.
Replace PROMPT_HERE with refinement prompt or original prompt.

**Note:** Refinement uses flux-dev for img2img capability with low strength (0.35) to preserve composition while enhancing quality.

**Optional overrides in $ARGUMENTS:**
- `--strength 0.2-0.5` - Denoising strength (lower = more original preserved)
- `--model flux-dev|sdxl` - Override refinement model
- `--open` - Force open image in Preview
- `--thumbnail` - Force generate thumbnail

After refinement:
1. Show output path
2. Compare original vs refined
3. Note the path for /art-detail if needed

**Usage examples:**
- `/art-refine /path/to/compose-v2.png` - Refine with default settings
- `/art-refine /path/to/compose-v2.png --strength 0.25` - Lighter refinement
- `/art-refine /path/to/compose-v2.png Enhanced details and sharper edges` - With custom prompt

$ARGUMENTS
