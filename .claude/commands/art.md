Generate an editorial illustration using the Art skill with settings from config.

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
OUTPUT_DIR="$ART_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Generate the image:
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
  --skill art \
  --output "$OUTPUT_DIR/art-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"
```

Replace PROMPT_HERE with the user's prompt from $ARGUMENTS.

**Optional overrides in $ARGUMENTS:**
- `--preset photorealistic|cinematic|artistic|raw` - Override default preset
- `--model flux|flux-pro|nano-banana-pro|gpt-image-1` - Override default model
- `--size 1K|2K|4K` - Override resolution
- `--aspect-ratio 1:1|16:9|3:2|4:3` - Override aspect ratio
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

After generation, show:
1. Output path
2. Seed for reproducibility (if available)
3. Preset and model used
4. Log location: `$ART_DIR/YYYY-MM-DD.jsonl`

$ARGUMENTS
