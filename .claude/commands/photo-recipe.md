Export a successful generation as a reusable recipe template.

Parse $ARGUMENTS to extract:
1. Image path (required) - the generated image to create a recipe from
2. Recipe name (optional) - custom name, defaults to timestamp

Execute these steps:

1. Load configuration:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
RECIPE_DIR="$PHOTO_DIR/recipes"
mkdir -p "$RECIPE_DIR"
```

2. Find the generation entry in the log:
```bash
# Extract date from image path (expects YYYY-MM-DD in path)
IMAGE_DATE=$(echo "IMAGE_PATH_HERE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
LOG_FILE="$PHOTO_DIR/$IMAGE_DATE.jsonl"

# Find the entry matching this output image
ENTRY=$(grep "IMAGE_PATH_HERE" "$LOG_FILE" | tail -1)
```

3. Parse the entry and create recipe:
```bash
# Extract fields from JSON
PROMPT=$(echo "$ENTRY" | jq -r '.prompt')
MODEL=$(echo "$ENTRY" | jq -r '.model')
PRESET=$(echo "$ENTRY" | jq -r '.preset // empty')
SEED=$(echo "$ENTRY" | jq -r '.seed // empty')
GUIDANCE=$(echo "$ENTRY" | jq -r '.parameters.guidance // empty')
STEPS=$(echo "$ENTRY" | jq -r '.parameters.steps // empty')
STRENGTH=$(echo "$ENTRY" | jq -r '.parameters.strength // empty')
SIZE=$(echo "$ENTRY" | jq -r '.size // "16:9"')
PHASE=$(echo "$ENTRY" | jq -r '.phase // empty')
```

4. Generate recipe file:
```bash
RECIPE_NAME="${RECIPE_NAME:-recipe-$(date +%Y%m%d-%H%M%S)}"
RECIPE_FILE="$RECIPE_DIR/$RECIPE_NAME.md"

cat > "$RECIPE_FILE" << 'RECIPE_EOF'
---
# Photorealistic Recipe
# Generated from: IMAGE_PATH_HERE
# Date: $(date +%Y-%m-%d)
model: $MODEL
${PRESET:+preset: $PRESET}
${SEED:+seed: $SEED}
${GUIDANCE:+guidance: $GUIDANCE}
${STEPS:+steps: $STEPS}
${STRENGTH:+strength: $STRENGTH}
size: $SIZE
${PHASE:+phase: $PHASE}
---
$PROMPT
RECIPE_EOF
```

Replace IMAGE_PATH_HERE with the user's image path from $ARGUMENTS.
Replace RECIPE_NAME with user's custom name if provided.

After creating the recipe, show:
1. Recipe file path
2. How to use: `bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts --prompt-file "$RECIPE_FILE" --output /path/to/new.png`

**Usage examples:**
- `/photo-recipe /path/to/image.png` - Export with auto-generated name
- `/photo-recipe /path/to/image.png sunset-cityscape` - Export with custom name

$ARGUMENTS
