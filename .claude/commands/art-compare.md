Generate the same prompt with multiple engines for side-by-side comparison.

This is a unique Art skill feature for multi-engine testing.

Execute these steps:

1. Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
OUTPUT_DIR="$ART_DIR/$(date +%Y-%m-%d)"
TIMESTAMP=$(date +%H%M%S)
mkdir -p "$OUTPUT_DIR"
```

2. Parse engines to compare (default: flux and nano-banana-pro):
- If $ARGUMENTS contains `--engines`, use the specified comma-separated list
- Otherwise default to: flux,nano-banana-pro

3. Generate with each engine sequentially:

**Flux generation:**
```bash
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model flux \
  --preset $ART_PRESET \
  --size 16:9 \
  --skill art \
  --output "$OUTPUT_DIR/compare-$TIMESTAMP-flux.png" \
  --prompt "PROMPT_HERE"
```

**Nano Banana Pro generation:**
```bash
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model nano-banana-pro \
  --preset $ART_PRESET \
  --size $ART_SIZE \
  --aspect-ratio $ART_ASPECT \
  --skill art \
  --output "$OUTPUT_DIR/compare-$TIMESTAMP-nano-banana-pro.png" \
  --prompt "PROMPT_HERE"
```

**Optional: GPT-image-1 (if --engines includes gpt-image-1):**
```bash
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --model gpt-image-1 \
  --preset $ART_PRESET \
  --size 1024x1024 \
  --skill art \
  --output "$OUTPUT_DIR/compare-$TIMESTAMP-gpt-image-1.png" \
  --prompt "PROMPT_HERE"
```

Replace PROMPT_HERE with the user's prompt from $ARGUMENTS.

**Optional overrides in $ARGUMENTS:**
- `--engines flux,nano-banana-pro,gpt-image-1` - Engines to compare (comma-separated)
- `--preset artistic|cinematic|photorealistic|raw` - Override preset
- `--open` - Open all generated images for comparison

After generation, show:
1. All generated image paths with their engine names
2. Timestamp used for correlation
3. Log location for viewing full details

**Example usage:**
- `/art-compare A mystical forest with glowing mushrooms` - Compare flux vs nano-banana-pro
- `/art-compare --engines flux,nano-banana-pro,gpt-image-1 Abstract geometric patterns` - Compare all three

$ARGUMENTS
