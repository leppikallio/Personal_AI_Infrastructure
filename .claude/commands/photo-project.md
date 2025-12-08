Manage photorealistic generation projects, components, and iterations.

Projects organize multi-component photorealistic images where individual elements (background, bridge, bench, figures) are generated separately through iteration chains and combined through a pipeline.

Parse $ARGUMENTS:
- No args: List all projects
- `PROJECT_NAME`: Show project details
- `--create PROJECT_NAME "description"`: Create new project
- `--components PROJECT_NAME`: List components in a project
- `--iterations PROJECT_NAME COMPONENT`: List iterations for a component
- `--chain PROJECT_NAME COMPONENT`: Show iteration chain/lineage
- `--status PROJECT_NAME`: Show project status and progress

Load configuration:
```bash
eval $(bun ${PAI_DIR}/skills/Photorealistic/get-photo-config.ts all)
PROJECTS_DIR="$PHOTO_DIR/projects"
```

## List All Projects (no args)

```bash
echo "=== Photorealistic Projects ==="
for dir in "$PROJECTS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  components=$(ls -1d "$dir/components"/*/ 2>/dev/null | wc -l | tr -d ' ')
  echo "  $name ($components components)"
done
```

## Show Project Details (PROJECT_NAME)

```bash
PROJECT="$PROJECTS_DIR/PROJECT_NAME"
if [ -d "$PROJECT" ]; then
  echo "=== Project: PROJECT_NAME ==="
  echo ""
  echo "Components:"
  for comp in "$PROJECT/components"/*/; do
    [ -d "$comp" ] || continue
    name=$(basename "$comp")
    iterations=$(ls -1d "$comp/iterations"/[0-9][0-9][0-9]-* 2>/dev/null | wc -l | tr -d ' ')
    echo "  $name: $iterations iterations"
  done
  echo ""
  echo "Masks:"
  ls -1 "$PROJECT/masks/"*.png 2>/dev/null | xargs -I{} basename {} || echo "  (none)"
fi
```

## Create New Project (--create PROJECT_NAME "description")

```bash
PROJECT="$PROJECTS_DIR/PROJECT_NAME"
mkdir -p "$PROJECT/components"
mkdir -p "$PROJECT/masks"
mkdir -p "$PROJECT/pipeline"
mkdir -p "$PROJECT/composite"

cat > "$PROJECT/project.json" << 'EOF'
{
  "name": "PROJECT_NAME",
  "created": "TIMESTAMP",
  "description": "DESCRIPTION_HERE",
  "dimensions": {
    "width": 1376,
    "height": 768
  },
  "components": [],
  "pipeline": null
}
EOF

echo "Created project: PROJECT_NAME"
echo "Next: /photo-compose --project PROJECT_NAME --component background --name base \"your prompt\""
```

## List Components (--components PROJECT_NAME)

```bash
PROJECT="$PROJECTS_DIR/PROJECT_NAME"
echo "=== Components in PROJECT_NAME ==="
for comp in "$PROJECT/components"/*/; do
  [ -d "$comp" ] || continue
  name=$(basename "$comp")
  iterations=$(ls -1d "$comp/iterations"/[0-9][0-9][0-9]-* 2>/dev/null | wc -l | tr -d ' ')
  selected=$(jq -r '.selected // "none"' "$comp/chain.json" 2>/dev/null || echo "none")
  echo ""
  echo "[$name] $iterations iterations, selected: $selected"
done
```

## List Iterations (--iterations PROJECT_NAME COMPONENT)

```bash
ITER_DIR="$PROJECTS_DIR/PROJECT_NAME/components/COMPONENT/iterations"
echo "=== Iterations for PROJECT_NAME/COMPONENT ==="
echo ""
for iter in "$ITER_DIR"/[0-9][0-9][0-9]-*/; do
  [ -d "$iter" ] || continue
  id=$(basename "$iter")
  phase=$(jq -r '.phase' "$iter/metadata.json" 2>/dev/null || echo "?")
  source=$(jq -r '.source // "null"' "$iter/metadata.json" 2>/dev/null)
  layer=$(jq -r '.layer // .name // ""' "$iter/metadata.json" 2>/dev/null)

  # Format: ID [phase] layer <- source
  if [ "$source" = "null" ]; then
    echo "  $id [$phase] $layer"
  else
    echo "  $id [$phase] $layer <- $source"
  fi
done
```

## Show Chain (--chain PROJECT_NAME COMPONENT)

Visualize the iteration chain as a tree:

```bash
ITER_DIR="$PROJECTS_DIR/PROJECT_NAME/components/COMPONENT/iterations"
echo "=== Iteration Chain for PROJECT_NAME/COMPONENT ==="
echo ""

# Build and display chain
# Start from iterations with no source (compose passes)
for iter in "$ITER_DIR"/[0-9][0-9][0-9]-compose-*/; do
  [ -d "$iter" ] || continue
  id=$(basename "$iter")
  echo "$id"

  # Find children (iterations that have this as source)
  for child in "$ITER_DIR"/[0-9][0-9][0-9]-*/; do
    [ -d "$child" ] || continue
    child_id=$(basename "$child")
    source=$(jq -r '.source // ""' "$child/metadata.json" 2>/dev/null)
    if [ "$source" = "$id" ]; then
      echo "  └── $child_id"
      # Find grandchildren
      for grandchild in "$ITER_DIR"/[0-9][0-9][0-9]-*/; do
        [ -d "$grandchild" ] || continue
        gc_id=$(basename "$grandchild")
        gc_source=$(jq -r '.source // ""' "$grandchild/metadata.json" 2>/dev/null)
        if [ "$gc_source" = "$child_id" ]; then
          echo "      └── $gc_id"
        fi
      done
    fi
  done
done
```

## Show Status (--status PROJECT_NAME)

Show completion status of each component and overall project progress.

```bash
PROJECT="$PROJECTS_DIR/PROJECT_NAME"
echo "=== Status: PROJECT_NAME ==="
echo ""
for comp in "$PROJECT/components"/*/; do
  [ -d "$comp" ] || continue
  name=$(basename "$comp")
  iterations=$(ls -1d "$comp/iterations"/[0-9][0-9][0-9]-* 2>/dev/null | wc -l | tr -d ' ')
  selected=$(jq -r '.selected // ""' "$comp/chain.json" 2>/dev/null)

  if [ -n "$selected" ]; then
    echo "  ✓ $name: $iterations iterations (selected: $selected)"
  else
    echo "  ○ $name: $iterations iterations (no selection)"
  fi
done
```

**Component types (standard):**
- background - Environment base layer
- bridge - Architectural elements
- bench - Props and furniture
- figure - Characters and people
- prop - Small objects
- overlay - Effects and atmosphere

**Usage examples:**
```bash
/photo-project                                    # List all projects
/photo-project gothic-park                        # Show project details
/photo-project --create gothic-park "Gothic park at dawn, circa 1898"
/photo-project --components gothic-park           # List components
/photo-project --iterations gothic-park background # List iterations
/photo-project --chain gothic-park background     # Show iteration chain
/photo-project --status gothic-park               # Show progress
```

$ARGUMENTS
