Generate a photorealistic image using FLUX with settings from config.

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
OUTPUT_DIR="$PHOTO_DIR/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"
```

2. Generate the image:
```bash
OPEN_FLAG=""
THUMB_FLAG=""
[ "$PHOTO_OPEN" = "true" ] && OPEN_FLAG="--open"
[ "$PHOTO_THUMBS" = "true" ] && THUMB_FLAG="--thumbnail"

bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model $PHOTO_MODEL \
  --preset $PHOTO_PRESET \
  --output "$OUTPUT_DIR/photo-$(date +%H%M%S).png" \
  $OPEN_FLAG $THUMB_FLAG \
  --prompt "PROMPT_HERE"
```

Replace PROMPT_HERE with the user's prompt from $ARGUMENTS.

**Optional overrides in $ARGUMENTS:**
- `--preset cinematic|artistic|raw` - Override default preset
- `--model flux-dev|flux-schnell` - Override default model
- `--open` - Force open image in Preview (overrides config)
- `--thumbnail` - Force generate thumbnail (overrides config)

After generation, show:
1. Output path
2. Seed for reproducibility
3. Preset and model used
4. Log location: `$PHOTO_DIR/YYYY-MM-DD.jsonl`

$ARGUMENTS
