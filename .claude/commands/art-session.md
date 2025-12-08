View Art skill generation session history and recipes.

Parse $ARGUMENTS:
- If a date is provided (YYYY-MM-DD format), view that date
- If "list" or "all", show available dates
- If "recipes", list saved recipes
- If empty, view today

Load configuration from settings.json:
```bash
eval $(bun ${PAI_DIR}/skills/Art/get-art-config.ts all)
```

Session data location: `$ART_DIR/`
- Log: `YYYY-MM-DD.jsonl`
- Images: `YYYY-MM-DD/*.png`
- Thumbnails: `YYYY-MM-DD/thumbs/*.png`
- Recipes: `recipes/*.md`

To view a session log:
```bash
cat "$ART_DIR/YYYY-MM-DD.jsonl" | jq -r '. | "\(.timestamp | split("T")[1] | split(".")[0]) [\(.phase // "single")] \(.model) seed:\(.seed // "none")\n  \"\(.prompt | .[0:70])...\"\n  -> \(.output_image)"'
```

To list available dates:
```bash
ls -1 "$ART_DIR"/*.jsonl 2>/dev/null | xargs -I{} basename {} .jsonl | sort -r
```

To list images for a date:
```bash
ls "$ART_DIR/YYYY-MM-DD/"
```

To list saved recipes:
```bash
ls -1 "$ART_DIR/recipes/"*.md 2>/dev/null | while read f; do
  name=$(basename "$f" .md)
  model=$(grep "^model:" "$f" | cut -d' ' -f2)
  echo "$name ($model)"
done
```

Display each generation with:
1. Timestamp
2. Phase
3. Prompt (truncated)
4. Model and seed
5. Output image path

**Recipe usage:**
To use a saved recipe:
```bash
bun ${PAI_DIR}/skills/Art/tools/generate-ulart-image.ts \
  --prompt-file "$ART_DIR/recipes/RECIPE_NAME.md" \
  --skill art \
  --output /path/to/output.png
```

$ARGUMENTS
